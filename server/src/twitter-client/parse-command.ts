import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from 'src/database/schemas/transactions.schema';
import { User } from 'src/database/schemas/user.schema';
import { WalletService } from 'src/wallet/wallet.service';
import { ethers } from 'ethers';
import { TwitterClientBase } from './base.provider';
import { UserService } from './user.service';
import { XfiDefiSeiService } from 'src/sei-core/sei.service';
import { IntentDetectionService } from 'src/intent-detection/intent-detection.service';

type TokenType = 'native' | 'stable' | 'token';
type ReceiverType = 'wallet' | 'ens' | 'username' | 'sns';
type Platform = 'twitter' | 'twitter-dm' | 'terminal';

interface Token {
  value: string;
  type: TokenType;
}

interface Receiver {
  address: string;
  type: ReceiverType;
  value?: string;
  userId?: string;
}

// --- Helper Data ---
const NATIVE_TOKENS = 'reef';

@Injectable()
export class ParseCommandService {
  private readonly logger = new Logger(ParseCommandService.name);
  private ethProvider: ethers.JsonRpcProvider;
  private provider = new ethers.JsonRpcProvider(process.env.REEF_RPC);
  constructor(
    private readonly walletService: WalletService,
    private readonly defiSeiService: XfiDefiSeiService,
    private readonly twitterClientBase: TwitterClientBase,
    private readonly userService: UserService,
    @InjectModel(User.name)
    readonly userModel: Model<User>,
    private readonly intentService: IntentDetectionService,
  ) {
    this.ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC);
  }

  private getEnsChainType(identifier: string): string {
    if (identifier.startsWith('@')) {
      return 'twitter';
    }

    const parts = identifier.toLowerCase().split('.');

    if (parts.length === 3 && parts[2] === 'eth') {
      return parts[1]; // e.g., 'mantle' from 'dami.base.eth'
    }

    if (parts.length === 2 && parts[1] === 'eth') {
      return 'ethereum'; // e.g., 'dami.eth'
    }

    if (parts.length === 2 && parts[1] === 'sei') {
      return 'sei'; // e.g., 'dami.sei'
    }

    return 'unknown';
  }

  private convertChainIdToCoinType(chainId: number): string {
    if (chainId === 1) {
      return 'addr';
    }
    const coinType = (0x80000000 | chainId) >>> 0;
    return coinType.toString(16).toUpperCase();
  }

  private convertReverseNodeToBytes(address: string, chainId: number): string {
    const addressFormatted = address.toLowerCase();
    const addressNode = ethers.solidityPackedKeccak256(
      ['string'],
      [addressFormatted.substring(2)],
    );

    const coinType = this.convertChainIdToCoinType(chainId);
    const baseReverseNode = ethers.namehash(`${coinType}.reverse`);

    const addressReverseNode = ethers.solidityPackedKeccak256(
      ['bytes32', 'bytes32'],
      [baseReverseNode, addressNode],
    );

    return addressReverseNode;
  }

  private encodeDnsName(name: string): string {
    const labels = name.split('.');
    const buffers = labels.map((label) => {
      const len = Buffer.from([label.length]);
      const str = Buffer.from(label, 'utf8');
      return Buffer.concat([len, str]);
    });
    return ethers.hexlify(Buffer.concat([...buffers, Buffer.from([0])]));
  }

  detectChain(chainOrToken: string): string {
    const normalized = chainOrToken.toLowerCase();

    if (normalized.includes('sei')) return 'sei';
    if (/^0x[a-fA-F0-9]{40}$/.test(chainOrToken)) return 'ethereum'; // EVM
    return 'sei'; // Default fallback
  }

  detectTokenType(value: string): TokenType {
    const lower = value.toLowerCase();
    if (NATIVE_TOKENS.includes(lower)) return 'native';
    if (STABLE_TOKENS.includes(lower)) return 'stable';
    return 'token';
  }

  detectReceiverType(value: string): ReceiverType {
    if (value.endsWith('.eth') || value.endsWith('.base.eth')) return 'ens';
    if (value.endsWith('.sei')) return 'sns';
    if (value.startsWith('@')) return 'username';
    return 'wallet';
  }

  // --- Placeholder Action Handlers ---

  async resolveENS(name: string): Promise<Receiver> {
    console.log('name  :', name);
    const ensChain = this.getEnsChainType(name);
    console.log(ensChain);
    switch (ensChain) {
      case 'ethereum':
        const ethAddress = await this.ethProvider.resolveName(name);
        console.log('ens name:', ethAddress);
        return {
          address: ethAddress,
          type: 'ens',
          value: name,
        };

      case 'twitter':
        try {
          const cleanUsername = name.replace(/^@/, '');
          const user = await this.twitterClientBase.fetchProfile(cleanUsername);
          console.log('User :', user);
          if (!user) {
            throw new Error('user does not exist');
          }
          const userExist = await this.getOrCreateUser({
            id: user.id,
            username: user.username,
          });
          if (!userExist) {
            throw new Error('error creating User');
          }
          return {
            address: userExist.walletAddress,
            type: 'username',
            value: name,
            userId: user.id,
          };
        } catch (error) {
          console.log(error);
          return;
        }

      default:
        return {
          address: process.env.ADMIN_WALLET_EVM,
          type: 'ens',
          value: name,
        };
    }
  }

  async handleNativeSend(
    chain: string,
    to: string,
    amount: string,
    user: User,
    originalCommand: string,
    platform: Platform = 'twitter',
    isUSD?: boolean,
    ensOrUsername?: string,
  ) {
    console.log(`Sending ${amount} native on ${chain} to ${to}`);
    try {
      if (chain == 'sei') {
        const data: Partial<Transaction> = {
          userId: user.userId,
          transactionType: 'send',
          chain: 'sei',
          amount: amount,
          token: { address: 'sei', tokenType: 'native' },
          receiver: { value: to, receiverType: 'wallet' },
          meta: {
            platform: platform,
            originalCommand: originalCommand,
          },
        };
        const response = await this.defiSeiService.sendSEI(
          user,
          amount,
          to,
          data,
          isUSD ? isUSD : false,
          ensOrUsername ? ensOrUsername : null,
        );
        return response;
      }
    } catch (error) {
      console.log(error);
    }
  }

  async handleERC20Send(
    chain: string,
    token: string,
    to: string,
    amount: string,
    user: User,
    originalCommand: string,
    platform: Platform = 'twitter',
    isUSD?: boolean,
    ensOrUsername?: string,
  ) {
    console.log(`Sending ${amount} stable ${token} on ${chain} to ${to}`);

    try {
      if (chain == 'sei') {
        const data: Partial<Transaction> = {
          userId: user.userId,
          transactionType: 'send',
          chain: 'sei',
          amount: amount,
          token: { address: token, tokenType: 'stable' },
          receiver: { value: to, receiverType: 'wallet' },
          meta: {
            platform: platform,
            originalCommand: originalCommand,
          },
        };
        const response = await this.defiSeiService.sendERC20(
          user,
          token,
          amount,
          to,
          data,
          isUSD ? isUSD : false,
          ensOrUsername ? ensOrUsername : null,
        );
        return response;
      }
    } catch (error) {
      console.log(error);
    }
  }

  async handleBuy(
    chain: string,
    token: string,
    nativeAmount: string,
    user: User,
    originalCommand: string,
    platform: Platform = 'twitter',
    isUSD?: boolean,
    inputToken?: string,
  ) {
    try {
      const data: Partial<Transaction> = {
        userId: user.userId,
        transactionType: 'buy',
        chain: 'sei',
        amount: isUSD ? `$${nativeAmount}` : nativeAmount,
        token: { address: 'sei', tokenType: 'native' },
        tokenIn: `${inputToken}` || 'sei',
        tokenOut: token,
        meta: {
          platform: platform,
          originalCommand: originalCommand,
        },
      };

      const response = await this.defiSeiService.buyToken(
        token,
        nativeAmount,
        user,
        data,
        isUSD ? isUSD : false,
        inputToken ? inputToken : null,
      );
      return response;
    } catch (error) {
      console.log(error);
    }
  }

  async handleSell(
    chain: string,
    token: string,
    amount: string,
    user: User,
    originalCommand: string,
    platform: Platform = 'twitter',
    isUSD?: boolean,
  ) {
    console.log(`Selling ${amount}% of ${token}`);
    try {
      const data: Partial<Transaction> = {
        userId: user.userId,
        transactionType: 'buy',
        chain: 'sei',
        amount: isUSD ? `$${amount}` : amount,
        token: { address: token, tokenType: 'token' },
        tokenIn: token,
        tokenOut: 'sei',
        meta: {
          platform: platform,
          originalCommand: originalCommand,
        },
      };
      const response = await this.defiSeiService.sellToken(
        token,
        amount,
        user,
        originalCommand,
        data,
        isUSD ? isUSD : false,
      );
      return response;
    } catch (error) {
      console.log(error);
    }
  }

  // --- 🎯 BUNDLED ENTRY FUNCTION ---
  async handleTweetCommand(
    tweet: string,
    userId: string,
    username?: string,
    platform: Platform = 'twitter',
  ) {
    let normalized = tweet.replace(/\s+/g, ' ').trim();
    normalized = this.removeFirstMention(normalized);

    const intent = await this.intentService.aiIntentDetector(normalized);
    console.log('intent :', intent);

    const appUrl = process.env.APP_URL;

    try {
      this.logger.log(tweet);
      const user = await this.userModel.findOne({ userId });
      if (intent.intent === 'UNKNOWN' && platform === 'twitter') {
        console.log('Unknown intent :', normalized);
        return;
      }
      if (!user || !user.isActive) {
        return `Please go to ${appUrl} create/activate your account to use this bot`;
      } else if (intent.intent === 'CHECK_BALANCE ' && platform === 'twitter') {
        return `Please go to ${appUrl} to check your account balance`;
      } else if (intent.intent === 'UNKNOWN' && platform === 'twitter') {
        return `Hi, if you’re trying to use a command or just curious how I work, you can check out the terminal at ${appUrl} or the available prompts and formats here:👉  ${process.env.PROMPT_DOC}`;
      }

      let to: Receiver;
      const action = intent.intent.toLowerCase();
      const chain = 'sei';
      const amount = intent.details?.amount
        ? intent.details.amount.toString()
        : null;
      const isUSD = intent.details?.amountType === 'USD';
      const token: Token = {
        value: intent.details?.token || null,
        type: this.detectTokenType(intent.details?.token || 'sei'),
      };
      const inputToken = intent.details?.buy?.spendToken || null;
      const receiverValue = intent.details?.receiver || null;
      const receiverType = receiverValue
        ? this.detectReceiverType(receiverValue)
        : null;
      const receiver: Receiver = receiverValue
        ? {
            address: receiverValue,
            type: receiverType,
            value: receiverValue,
          }
        : null;

      console.log(
        'action, chain, amount, token, receiver, isUSD, inputToken :',
        action,
        chain,
        amount,
        token,
        receiver,
        isUSD,
        inputToken,
      );

      if (receiver) {
        if (receiver.type === 'ens' || receiver.type === 'username') {
          //TODO:
          to = await this.resolveENS(receiver.value);
        } else {
          to = {
            address: receiver.value,
            type: 'wallet',
            value: receiver.value,
          };
        }
      }

      switch (action) {
        case 'send_token':
        case 'tip_token':
          console.log('to :', to);
          if (!to || !to.value || !to.type) return;
          if (!amount || amount === 0) return;
          if (token.type === 'native') {
            const nativeResponse = await this.handleNativeSend(
              chain,
              to.address,
              amount,
              user,
              tweet,
              platform,
              isUSD,
              to.type !== 'wallet' ? to.value : null,
            );

            return nativeResponse;
          }

          if (token.type === 'stable' || token.type === 'token') {
            const stableResponse = await this.handleERC20Send(
              chain,
              token.value,
              to.address,
              amount,
              user,
              tweet,
              platform,
              isUSD,
              to.type !== 'wallet' ? to.value : null,
            );
            return stableResponse;
          }

        case 'buy_token':
          if (!intent.details?.buy?.tokenToBuy) return;
          if (!intent.details?.buy?.amountToSpend) return;

          return this.handleBuy(
            chain,
            intent.details.buy.tokenToBuy,
            intent.details.buy.amountToSpend,
            user,
            tweet,
            platform,
            intent.details.buy.amountType === 'USD',
            inputToken,
          );

        case 'sell_token':
          if (!intent.details?.sell?.tokenToSell) return;
          if (!intent.details?.sell?.sellPercentage) return;
          return this.handleSell(
            chain,
            intent.details.sell.tokenToSell,
            intent.details.sell.sellPercentage
              ? `${intent.details.sell.sellPercentage.toString()}%`
              : null,
            user,
            tweet,
            platform,
            intent.details.amountType === 'USD',
          );
      }
    } catch (error) {
      console.log(error);
    }
  }

  private async getOrCreateUser(
    user: { id: string; username: string },
    dm?: boolean,
  ) {
    let existingUser = await this.userModel.findOne({ userId: user.id });

    if (!existingUser) {
      const newEvmWallet = await this.walletService.createEvmWallet();

      const encryptedEvmWalletDetails =
        await this.walletService.encryptEvmWallet(
          process.env.DYNAMIC_WALLET_SECRET!,
          newEvmWallet.privateKey,
        );

      existingUser = new this.userModel({
        userId: user.id,
        userName: user.username,
        walletAddress: newEvmWallet.address,
        walletDetails: encryptedEvmWalletDetails.json,
        isActive: dm ? true : false, // make account active if it was a directmessage comamnd
      });
      return existingUser.save();
    }

    return existingUser;
  }

  private normalizeChain = (raw) => {
    if (!raw) return null;
    const value = raw.toLowerCase();
    if (value === 'sei' || value === 'sei') return 'sei';
    if (value === 'eth' || value === 'ethereum') return 'ethereum';
    if (value === 'sei') return 'sei';
    return null;
  };

  // to formate directMessge balance response
  private formatBalances(balances: Record<string, any[]>): string {
    let result = 'BALANCE:\n\n';

    for (const [chain, tokens] of Object.entries(balances)) {
      result += `chain: ${chain}\n`;

      for (const token of tokens) {
        const amountNum =
          typeof token.amount === 'number'
            ? token.amount
            : parseFloat(token.amount);

        const formattedAmount = Number(amountNum).toPrecision(4);
        result += `${formattedAmount} - ${token.tokenSymbol}\n`;
      }

      result += `\n`; // extra newline between chains
    }

    return result.trim(); // remove last extra newline
  }

  removeFirstMention(str: string): string {
    return str.replace(/^@\S+\s*/, '').trim();
  }
}
