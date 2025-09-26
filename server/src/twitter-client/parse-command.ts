import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from 'src/database/schemas/transactions.schema';
import { User } from 'src/database/schemas/user.schema';
import { WalletService } from 'src/wallet/wallet.service';
import { ethers } from 'ethers';
import { TwitterClientBase } from './base.provider';
import { IntentDetectionService } from 'src/intent-detection/intent-detection.service';
import { ReefCoreService } from 'src/reef-core/reef-core.service';

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
const NATIVE_TOKENS = ['reef'];

@Injectable()
export class ParseCommandService {
  private readonly logger = new Logger(ParseCommandService.name);
  private ethProvider: ethers.JsonRpcProvider;
  private provider = new ethers.JsonRpcProvider(process.env.REEF_RPC);
  constructor(
    private readonly walletService: WalletService,
    private readonly reefCoreService: ReefCoreService,
    private readonly twitterClientBase: TwitterClientBase,
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

    if (normalized.includes('reef')) return 'reef';
    if (/^0x[a-fA-F0-9]{40}$/.test(chainOrToken)) return 'ethereum'; // EVM
    return 'reef'; // Default fallback
  }

  detectTokenType(value: string): TokenType {
    const lower = value.toLowerCase();
    if (NATIVE_TOKENS.includes(lower)) return 'native';
    return 'token';
  }

  detectReceiverType(value: string): ReceiverType {
    if (value.endsWith('.eth') || value.endsWith('.base.eth')) return 'ens';
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
      if (chain == 'reef') {
        const data: Partial<Transaction> = {
          userId: user.userId,
          transactionType: 'send',
          chain: 'reef',
          amount: amount,
          token: { address: 'reef', tokenType: 'native' },
          receiver: { value: to, receiverType: 'wallet' },
          meta: {
            platform: platform,
            originalCommand: originalCommand,
          },
        };
        const response = await this.reefCoreService.sendReef(
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
    console.log(platform);
    try {
      this.logger.log(tweet);
      let user = await this.userModel.findOne({ userId });
      if (
        (!user && platform === 'twitter-dm') ||
        intent.intent === 'ACTIVATE'
      ) {
        user = await this.getOrCreateUser(
          {
            id: userId,
            username,
          },
          true,
        );
        if (intent.intent === 'ACTIVATE') {
          let response = `${intent.followup ?? ''}\n`;
          response += `Wallet: 👇`;
          return { response, wallet: user.walletAddress };
        }
        return { response: 'Your wallet: 👇', wallet: user.walletAddress };
      } else if (intent.intent === 'UNKNOWN' && platform === 'twitter-dm') {
        console.log('Unknown intent :', normalized);
        return `${intent.followup}`;
      } else if (!user || (!user.isActive && platform !== 'twitter-dm')) {
        return `Please send me a direct Message to create/activate your account`;
      } else if (intent.intent === 'CHECK_BALANCE ' && platform === 'twitter') {
        return `Please send me a direct Message  to check your account balance`;
      } else if (
        intent.intent === 'CHECK_BALANCE' &&
        platform === 'twitter-dm' &&
        user
      ) {
        const balance = await this.reefCoreService.getBalance(
          user.walletAddress,
        );

        const formatedBalance = this.formatBalances(
          balance.formatted,
          balance.address,
        );
        return formatedBalance;
      } else if (
        intent.intent === 'EXPORT' &&
        platform === 'twitter-dm' &&
        user
      ) {
        const detail = await this.exportWallet(user);

        return detail;
      } else if (intent.intent === 'UNKNOWN' && platform !== 'twitter-dm') {
        return;
      }

      let to: Receiver;
      const action = intent.intent.toLowerCase();
      const chain = 'reef';
      const amount = intent.details?.amount
        ? intent.details.amount.toString()
        : null;
      const isUSD = intent.details?.amountType === 'USD';
      const token: Token = {
        value: intent.details?.token || null,
        type: this.detectTokenType(intent.details?.token || 'reef'),
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
        case 'drop_token':
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

  // to formate directMessge balance response
  private formatBalances(balance, address: string): string {
    let result = 'BALANCE:\n\n';
    result += `Chain: Reef Pelagia\n`;
    result += `Address: ${address}\n`;

    const formattedAmount = Number(balance).toPrecision(4);
    result += `${formattedAmount} - REEF\n`;

    return result.trim(); // remove last extra newline
  }

  async exportWallet(user: User) {
    const decryptedEvmWallet = await this.walletService.decryptEvmWallet(
      process.env.DYNAMIC_WALLET_SECRET!,
      user.walletDetails,
    );

    return {
      response: `‼️Never share your private key or seed phrase with anyone‼️\n For instruction on how to add the Reef Palegia network to you wallet, check out this page https://www.notion.so/reefchain/Reef-at-Web3Conf-Enugu-2757048bea5480cba429fb7b7d9a6f89?source=copy_link\n private key 👇`,
      wallet: `${decryptedEvmWallet.privateKey}`,
    };
  }

  removeFirstMention(str: string): string {
    return str.replace(/^@\S+\s*/, '').trim();
  }
}
