import { Injectable, Logger } from '@nestjs/common';
import { WalletService } from 'src/wallet/wallet.service';
import { HttpService } from '@nestjs/axios';
import { Transaction } from 'src/database/schemas/transactions.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { console } from 'inspector';

const USDC_ADDRESS_ETHEREUM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS_ETHEREUM = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

@Injectable()
export class XfiDefiEthereumService {
  private readonly logger = new Logger(XfiDefiEthereumService.name);
  constructor(
    private readonly httpService: HttpService,
    private readonly walletService: WalletService,
    @InjectModel(Transaction.name)
    readonly transactionModel: Model<Transaction>,
  ) {}

  async sendEth(
    privateKey: string,
    amount: string,
    reciever: string,
    data: Partial<Transaction>,
  ) {
    try {
      const { address } =
        await this.walletService.getEvmAddressFromPrivateKey(privateKey);

      this.logger.log(address);

      const { balance } = await this.walletService.getNativeEthBalance(
        String(address),
        process.env.ETHEREUM_RPC,
      );

      this.logger.log(balance);

      if (balance < Number(amount)) {
        return 'Insufficient balance.';
      }

      const txn = await this.walletService.transferEth(
        privateKey,
        reciever,
        parseFloat(amount),
        process.env.ETHEREUM_RPC,
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
        return `https://etherscan.io/tx/${receipt.transactionHash}`;
      }
      return;
    } catch (error) {
      console.log(error);
      this.logger.log(error);
      return `error sending token`;
    }
  }

  async sendERC20(
    privateKey: string,
    token: string,
    amount: string,
    receiver: string,
    data: Partial<Transaction>,
  ) {
    try {
      this.logger.log(token);
      const tokenAddresses: Record<string, string> = {
        usdc: USDC_ADDRESS_ETHEREUM,
        usdt: USDT_ADDRESS_ETHEREUM,
      };

      const tokenAddress = tokenAddresses[token.toLowerCase()];
      if (!tokenAddress) return 'Unsupported token.';

      const { address } =
        await this.walletService.getEvmAddressFromPrivateKey(privateKey);

      this.logger.log('Sender Address:', address);

      const { balance } = await this.walletService.getERC20Balance(
        String(address),
        tokenAddress,
        process.env.ETHEREUM_RPC,
      );
      this.logger.log('Balance:', balance);

      if (balance < Number(amount)) {
        return 'Insufficient balance.';
      }

      const response = await this.walletService.transferERC20(
        privateKey,
        receiver,
        tokenAddress,
        parseFloat(amount),
        process.env.ETHEREUM_RPC,
      );

      if (response?.signature) {
        try {
          await new this.transactionModel({
            ...data,
            txHash: response.signature,
          }).save();
        } catch (err) {
          console.error('Failed to save transaction:', err.message);
        }
        return `https://etherscan.io/tx/${response.signature}`;
      }

      return 'Transfer failed. No signature received.';
    } catch (error) {
      this.logger.log(error);
      console.error(error);
      return 'Error sending token.';
    }
  }
}
