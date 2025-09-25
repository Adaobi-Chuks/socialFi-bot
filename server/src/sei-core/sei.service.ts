import { Injectable, Logger } from '@nestjs/common';
import { WalletService } from 'src/wallet/wallet.service';
import { HttpService } from '@nestjs/axios';
import { Transaction } from 'src/database/schemas/transactions.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers, Signer } from 'ethers';
import { User } from 'src/database/schemas/user.schema';

const {
  Symphony,
  getRouteDetails,
  swap,
  giveApproval,
  checkApproval,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = require('symphony-sdk/ethers');

export interface ITokenPriceDetail {
  token_price_usd: string;
}

const USDC_SEI = '0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392';
const USDT_SEI = '0x9151434b16b9763660705744891fa906f660ecc5';
// const USDC_n_SEI = '0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1';

@Injectable()
export class XfiDefiSeiService {
  private readonly logger = new Logger(XfiDefiSeiService.name);
  private symphony = new Symphony();
  private provider = new ethers.JsonRpcProvider(process.env.SEI_RPC);
  constructor(
    private readonly httpService: HttpService,
    private readonly walletService: WalletService,
    @InjectModel(Transaction.name)
    readonly transactionModel: Model<Transaction>,
  ) {}

  async sendSEI(
    user: User,
    amount: string,
    reciever: string,
    data: Partial<Transaction>,
    isUSD?: boolean,
    ensOrUsername?: string,
  ) {
    try {
      const decryptedEvmWallet = await this.walletService.decryptEvmWallet(
        process.env.DYNAMIC_WALLET_SECRET!,
        user.walletDetails,
      );

      const { balance } = await this.walletService.getNativeEthBalance(
        user.walletAddress as `0x${string}`,
        process.env.SEI_RPC,
      );

      this.logger.log(balance);

      if (isUSD) {
        const tokenDetails = await this.getTokenDetailsBasePrice('0x0');
        if (tokenDetails) {
          const price = parseFloat(tokenDetails.token_price_usd);
          const seiAmount = parseFloat(amount) / price;
          amount = seiAmount.toString();
        }
      }

      if (balance < Number(amount)) {
        return 'Insufficient balance.';
      }

      const txn = await this.walletService.transferEth(
        decryptedEvmWallet.privateKey,
        reciever,
        parseFloat(amount),
        process.env.SEI_RPC,
      );
      const receipt =
        txn?.wait && typeof txn.wait === 'function' ? await txn.wait() : txn;

      if (receipt.status === 1) {
        try {
          await new this.transactionModel({
            ...data,
            txHash: receipt.transactionHash,
          }).save();
        } catch (err) {
          console.error('Failed to save transaction:', err.message);
        }
        // return `https://seitrace.com/tx/${receipt.transactionHash}`;
        return `Sent ${amount} $SEI to ${ensOrUsername ? ensOrUsername : reciever}\nhttps://seitrace.com/tx/${receipt.transactionHash}`;
      }
      return;
    } catch (error) {
      console.log(error);
      this.logger.log(error);
      return `error sending token`;
    }
  }

  async sendERC20(
    user: User,
    token: string,
    amount: string,
    reciever: string,
    data: Partial<Transaction>,
    isUSD?: boolean,
    ensOrUsername?: string,
  ) {
    try {
      console.log('Sending ERC20....');
      const tokenSymbol = token;
      const isStable =
        token.toLowerCase().trim() === 'usdc' ||
        token.toLowerCase().trim() === 'usdt';

      const isAddress = token.startsWith('0x');
      let decimals = 6;
      if (!isStable && !isAddress) {
        try {
          const supportedToken = await this.getSupportedTokens();

          const tokenInfo: any = Object.values(supportedToken).find(
            (t: any) =>
              t.attributes.symbol.toLowerCase() === token.toLowerCase().trim(),
          );
          if (tokenInfo) {
            token = tokenInfo.attributes.address;
            decimals = tokenInfo.attributes.decimals;
            console.log('tokenInfo :', tokenInfo);
          } else {
            return `Token ${token} not supported on https://symph.ag/`;
          }
        } catch (error) {
          console.error('Error fetching supported tokens:', error);
          return `Token ${token} not supported on https://symph.ag/`;
        }
      }

      const decryptedEvmWallet = await this.walletService.decryptEvmWallet(
        process.env.DYNAMIC_WALLET_SECRET!,
        user.walletDetails,
      );
      if (token.toLowerCase().trim() === 'usdc') {
        token = USDC_SEI;
      } else if (token.toLowerCase().trim() === 'usdt') {
        token = USDT_SEI;
      }

      if (isUSD && token !== USDC_SEI && token !== USDT_SEI) {
        const tokenDetails = await this.getTokenDetailsBasePrice(token);
        if (tokenDetails) {
          const price = parseFloat(tokenDetails.token_price_usd);
          const seiAmount = parseFloat(amount) / price;
          amount = seiAmount.toString();
        }
      }

      const { balance } = await this.walletService.getERC20Balance(
        user.walletAddress as `0x${string}`,
        token,
        process.env.SEI_RPC,
      );
      this.logger.log('Balance:', balance);

      if (balance < Number(amount)) {
        return 'Insufficient balance.';
      }

      const txn = await this.walletService.transferERC20(
        decryptedEvmWallet.privateKey,
        reciever,
        token,
        parseFloat(Number(amount).toFixed(decimals)),
        process.env.SEI_RPC,
      );
      const response =
        txn?.wait && typeof txn.wait === 'function' ? await txn.wait() : txn;

      if (response.status === 1) {
        try {
          await new this.transactionModel({
            ...data,
            txHash: response.transactionHash,
          }).save();
        } catch (err) {
          console.error('Failed to save transaction:', err.message);
        }
        return `Sent ${parseFloat(Number(amount).toFixed(decimals))} ${tokenSymbol} to ${ensOrUsername ? ensOrUsername : reciever}\nhttps://seitrace.com/tx/${response.transactionHash}`;
      }
      return;
    } catch (error) {
      console.log(error);
      this.logger.log(error);

      if (error.code === 'INSUFFICIENT_FUNDS') {
        return 'Insufficient balance for gas fee.';
      }
      if (error.code === 'NUMERIC_FAULT') {
        return 'Amount decimals issue, try rounding it up or down.';
      }

      return `error sending token`;
    }
  }

  async getSwapRoute(tokenIn: string, tokenOut: string, amount: string) {
    const route = await this.symphony.getRoute(tokenIn, tokenOut, amount);
    const details = await getRouteDetails(route.route);
    return { route, routeDetails: details };
  }

  async getSupportedTokens() {
    const tokenLists = await this.symphony.getTokenList();
    return tokenLists;
  }

  async isTokenSupported(address: string) {
    const tokenListed = await this.symphony.isTokenListed(
      address.toLowerCase().trim(),
    );
    return tokenListed;
  }

  async getTokenDetailsBasePrice(
    targetId: string,
  ): Promise<ITokenPriceDetail | null> {
    try {
      const response = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/sei-evm/tokens/${targetId === '0x0' ? '0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7' : targetId}`,
      );

      if (!response.ok) throw new Error('Failed to fetch token list');

      const result = await response.json();
      const token = result.data;
      if (!token) throw new Error('Token not found');

      const tokenDetail = {
        token_price_usd: result.data.attributes.price_usd,
      };

      return tokenDetail;
    } catch (error) {
      console.error('Error fetching token details by ID:', error);
      return null;
    }
  }

  async swapToken(
    tokenIn: string,
    tokenOut: string,
    amount: string,
    user: User,
    data: Partial<Transaction>,
  ) {
    console.log('Swapping ....');

    const nativeAddress = this.symphony.getConfig().nativeAddress;
    const decryptedEvmWallet = await this.walletService.decryptEvmWallet(
      process.env.DYNAMIC_WALLET_SECRET!,
      user.walletDetails,
    );

    const provider = new ethers.JsonRpcProvider(process.env.SEI_RPC);
    const signer = new ethers.Wallet(decryptedEvmWallet.privateKey, provider);
    let includesNative = false;

    const route = await this.symphony.getRoute(tokenIn, tokenOut, amount);

    if (tokenIn === nativeAddress || tokenOut === nativeAddress) {
      includesNative = true;
      console.log('Swapping ...., isNative');
    }
    const transaction = await swap({
      route: route.route,
      includesNative,
      signer,
      options: {
        skipApproval: true,
        skipCheckApproval: true,
      },
      slippage: {
        slippageAmount: '1',
        isRaw: true,
        isBps: false,
      },
    });

    console.log('Transaction Hash:', transaction);
    if (transaction.swapReceipt.hash) {
      try {
        await new this.transactionModel({
          ...data,
          txHash: transaction.swapReceipt.hash,
        }).save();
      } catch (err) {
        console.error('Failed to save transaction:', err.message);
      }
    }
    return `https://seitrace.com/tx/${transaction.swapReceipt.hash}`;
  }

  async buyToken(
    tokenOut: string,
    amount: string,
    user: User,
    data: Partial<Transaction>,
    isUSD?: boolean,
    tokenIn?: string,
  ) {
    try {
      console.log('Buying ....');
      console.log(isUSD, tokenIn, tokenOut, amount);
      let tokenInSymbol = tokenIn || 'SEI';
      let tokenOutSymbol = tokenOut;
      let decimals = 6;
      let tokenInBalance;
      tokenOut = tokenOut ? this.removeDollar(tokenOut) : tokenOut;
      tokenIn = tokenIn ? this.removeDollar(tokenIn) : tokenIn;
      const nativeAddress = this.symphony.getConfig().nativeAddress;
      if (tokenIn) {
        tokenIn =
          tokenIn.toLowerCase().trim() === 'sei' ? nativeAddress : tokenIn;
      } else {
        tokenIn = nativeAddress;
      }

      const isTokenInAddress = tokenIn.startsWith('0x');
      const isTokenOutAddress = tokenOut.startsWith('0x');
      if (!isTokenOutAddress) {
        try {
          const supportedToken = await this.getSupportedTokens();

          const tokenInfo: any = Object.values(supportedToken).find(
            (t: any) =>
              t.attributes.symbol.toLowerCase() ===
              tokenOut.toLowerCase().trim(),
          );
          if (tokenInfo) {
            tokenOut = tokenInfo.attributes.address;
            tokenOutSymbol = tokenInfo.attributes.symbol;
          } else {
            return `Token ${tokenOut} not supported on https://symph.ag/`;
          }
        } catch (error) {
          console.error('Error fetching supported tokens:', error);
          return `Token ${tokenOut} not supported on https://symph.ag/`;
        }
      }
      console.log(tokenIn, tokenOut, amount);
      if (!isTokenInAddress && tokenIn !== nativeAddress) {
        try {
          const supportedToken = await this.getSupportedTokens();

          const tokenInfo: any = Object.values(supportedToken).find(
            (t: any) =>
              t.attributes.symbol.toLowerCase() ===
              tokenIn.toLowerCase().trim(),
          );
          if (tokenInfo) {
            tokenIn = tokenInfo.attributes.address;
            tokenInSymbol = tokenInfo.attributes.symbol;
            decimals = tokenInfo.attributes.decimals;
          } else {
            return `Token ${tokenIn} not supported on https://symph.ag/`;
          }
        } catch (error) {
          console.error('Error fetching supported tokens:', error);
          return `Token ${tokenIn} not supported on https://symph.ag/`;
        }
      }
      console.log(tokenIn, tokenOut, amount);

      if (isUSD) {
        const tokenDetails = await this.getTokenDetailsBasePrice(tokenIn);
        if (tokenDetails) {
          const price = parseFloat(tokenDetails.token_price_usd);
          const tokenInAmount = parseFloat(amount) / price;
          amount = tokenInAmount.toString();
        }
      }
      if (tokenIn !== nativeAddress) {
        const { balance } = await this.walletService.getERC20Balance(
          user.walletAddress as `0x${string}`,
          tokenIn,
          process.env.SEI_RPC,
        );
        tokenInBalance = balance;
        console.log('BalanceErc20:', tokenInBalance);
      } else {
        const { balance } = await this.walletService.getNativeEthBalance(
          user.walletAddress as `0x${string}`,
          process.env.SEI_RPC,
        );
        tokenInBalance = balance;
        console.log('seiBalance :', tokenInBalance);
      }

      if (tokenInBalance < Number(amount)) {
        return 'Insufficient balance.';
      }

      const decryptedEvmWallet = await this.walletService.decryptEvmWallet(
        process.env.DYNAMIC_WALLET_SECRET!,
        user.walletDetails,
      );
      const provider = new ethers.JsonRpcProvider(process.env.SEI_RPC);
      const signer = new ethers.Wallet(decryptedEvmWallet.privateKey, provider);
      let includesNative = false;
      console.log(tokenIn, tokenOut, amount);
      const route = await this.symphony.getRoute(
        tokenIn,
        tokenOut,
        Number(amount).toFixed(decimals).toString(),
      );

      console.log(route);
      if (!route || !route.route) {
        return 'No route found for this swap OR swap amount is too low.';
      }
      if (tokenIn === nativeAddress || tokenOut === nativeAddress) {
        includesNative = true;
        console.log('Swapping ...., isNative');
      }

      if (tokenIn !== nativeAddress) {
        await this.giveTokenApproval(
          tokenIn,
          Number(amount).toFixed(decimals).toString(),
          signer,
        );
        console.log('Approval done....');
      }

      const transaction = await swap({
        route: route.route,
        includesNative,
        signer,
        options: {
          skipApproval: true,
          skipCheckApproval: true,
        },
        slippage: {
          slippageAmount: '1',
          isRaw: true,
          isBps: false,
        },
      });

      console.log('Transaction Hash:', transaction);

      if (transaction.swapReceipt.hash) {
        try {
          await new this.transactionModel({
            ...data,
            txHash: transaction.swapReceipt.hash,
          }).save();
        } catch (err) {
          console.error('Failed to save transaction:', err.message);
        }
      }
      // return `https://seitrace.com/tx/${transaction.swapReceipt.hash}`;
      return `swapped ${amount} $${this.removeDollar(tokenInSymbol)} for ${route.amountOutFormatted} $${this.removeDollar(tokenOutSymbol)}\nhttps://seitrace.com/tx/${transaction.swapReceipt.hash}`;
    } catch (error) {
      console.error('Error in buyToken:', error);
      return 'An error occurred while trying to buy the token.';
    }
  }

  async sellToken(
    tokenIn: string,
    amount: string,
    user: User,
    originalCommand: string,
    data: Partial<Transaction>,
    isUSD?: boolean,
  ) {
    console.log('Swapping ....');
    console.log(tokenIn, amount, isUSD);
    let tokenInSymbol = tokenIn;
    let decimals = 6;

    tokenIn = tokenIn ? this.removeDollar(tokenIn) : tokenIn;
    const nativeAddress = this.symphony.getConfig().nativeAddress;
    const tokenOut = nativeAddress;

    const isTokenInAddress = tokenIn.startsWith('0x');
    if (!isTokenInAddress) {
      try {
        const supportedToken = await this.getSupportedTokens();

        const tokenInfo: any = Object.values(supportedToken).find(
          (t: any) =>
            t.attributes.symbol.toLowerCase() === tokenIn.toLowerCase().trim(),
        );
        if (tokenInfo) {
          tokenIn = tokenInfo.attributes.address;
          tokenInSymbol = tokenInfo.attributes.symbol;
          decimals = tokenInfo.attributes.decimals;
        } else {
          return `Token ${tokenIn} not supported on https://symph.ag/`;
        }
      } catch (error) {
        console.error('Error fetching supported tokens:', error);
        return `Token ${tokenIn} not supported on https://symph.ag/`;
      }
    }
    console.log(tokenIn, tokenOut, amount);

    const isPercentage =
      amount.startsWith('%') ||
      amount.endsWith('%') ||
      amount.toLowerCase() === 'all';

    if (isPercentage) {
      const { balance } = await this.walletService.getERC20Balance(
        user.walletAddress as `0x${string}`,
        tokenIn,
        process.env.SEI_RPC,
      );
      if (
        amount.toLowerCase() === 'all' ||
        this.removeDollarOrPercent(amount).toLowerCase() === '100'
      ) {
        amount = balance.toString();
        console.log('BalanceErc20:', balance);
        console.log('amount to swap :', amount);
      } else {
        console.log('BalanceErc20:', balance);
        console.log('percentage to swap :', amount);
        let percent = this.removeDollarOrPercent(amount);
        percent = (Number(percent) / 100).toString();
        console.log('percent :', percent);
        amount = (Number(balance) * Number(percent)).toString();
        console.log('amount to swap :', amount);
      }
    }

    if (isUSD) {
      const tokenDetails = await this.getTokenDetailsBasePrice(tokenIn);
      if (tokenDetails) {
        amount = await this.removeDollarOrPercent(amount);
        const price = parseFloat(tokenDetails.token_price_usd);
        const tokenInAmount = parseFloat(amount) / price;
        amount = tokenInAmount.toString();
        console.log(amount);
      }
    }
    const { balance } = await this.walletService.getERC20Balance(
      user.walletAddress as `0x${string}`,
      tokenIn,
      process.env.SEI_RPC,
    );

    console.log('BalanceErc20:', balance);

    if (balance < Number(amount)) {
      return 'Insufficient balance.';
    }

    const decryptedEvmWallet = await this.walletService.decryptEvmWallet(
      process.env.DYNAMIC_WALLET_SECRET!,
      user.walletDetails,
    );
    const provider = new ethers.JsonRpcProvider(process.env.SEI_RPC);
    const signer = new ethers.Wallet(decryptedEvmWallet.privateKey, provider);
    let includesNative = false;

    await this.giveTokenApproval(
      tokenIn,
      Number(amount).toFixed(decimals).toString(),
      signer,
    );
    console.log('Approval done....');

    const route = await this.symphony.getRoute(tokenIn, tokenOut, amount);

    if (tokenIn === nativeAddress || tokenOut === nativeAddress) {
      includesNative = true;
      console.log('Swapping ...., isNative');
    }

    const transaction = await swap({
      route: route.route,
      includesNative,
      signer,
      options: {
        skipApproval: true,
        skipCheckApproval: true,
      },
      slippage: {
        slippageAmount: '1',
        isRaw: true,
        isBps: false,
      },
    });

    console.log('Transaction Hash:', transaction);

    if (transaction.swapReceipt.hash) {
      try {
        await new this.transactionModel({
          ...data,
          txHash: transaction.swapReceipt.hash,
        }).save();
      } catch (err) {
        console.error('Failed to save transaction:', err.message);
      }
    }
    return `swapped ${amount} $${this.removeDollar(tokenInSymbol)} for ${route.amountOutFormatted} $SEI\nhttps://seitrace.com/tx/${transaction.swapReceipt.hash}`;
  }

  async giveTokenApproval(tokenIn: string, amount: string, signer: Signer) {
    console.log('Giving Approval ....', tokenIn, amount);
    console.log('Approving ....');
    const isApproved = await checkApproval({
      variable: tokenIn,
      signer,
      amount,
      options: { isRaw: false },
    });
    if (isApproved) {
      console.log('Token already approved');
      return { message: 'Token already approved' };
    }
    const approve = await giveApproval({
      variable: tokenIn,
      signer,
      amount,
      options: { isRaw: false },
    });
    console.log('Approval transaction hash:', approve.hash);
    return { txHash: approve.hash };
  }

  private removeDollar(str) {
    return str.replace(/^\$/, ''); // removes $ only at the start
  }

  private removeDollarOrPercent(str: string): string {
    return str.replace(/^[$%]|[$%]$/g, '');
  }
}
