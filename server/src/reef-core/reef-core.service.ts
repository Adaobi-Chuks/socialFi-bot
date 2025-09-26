import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JsonRpcProvider, Wallet, formatEther, parseEther } from 'ethers';
import { Model } from 'mongoose';
import { Transaction } from 'src/database/schemas/transactions.schema';
import { User } from 'src/database/schemas/user.schema';
import { WalletService } from 'src/wallet/wallet.service';

export interface ITokenPriceDetail {
  token_price_usd: string;
}

@Injectable()
export class ReefCoreService {
  private readonly provider: JsonRpcProvider;

  constructor(
    private readonly walletService: WalletService,
    @InjectModel(Transaction.name)
    readonly transactionModel: Model<Transaction>,
  ) {
    const RPC_URL = process.env.RPC_URL || 'http://34.123.142.246:8545';

    this.provider = new JsonRpcProvider(RPC_URL);
  }

  /**
   * Create a Wallet instance from a private key
   */
  private getWallet(pk: string): Wallet {
    if (!pk) throw new Error('Private key is required');

    // ensure hex format with 0x
    let normalizedPk = pk.trim();
    if (!normalizedPk.startsWith('0x')) {
      normalizedPk = '0x' + normalizedPk;
    }

    try {
      return new Wallet(normalizedPk, this.provider);
    } catch {
      throw new Error('Invalid private key');
    }
  }

  /**
   * Get REEF balance
   */
  async getBalance(address: string) {
    const target = address;
    const raw = await this.provider.getBalance(target);

    return {
      address: target,
      formatted: formatEther(raw),
    };
  }

  /**
   * Send REEF
   */
  async send(pk: string, to: string, amount: string) {
    const wallet = this.getWallet(pk);

    const tx = await wallet.sendTransaction({
      to,
      value: parseEther(amount),
    });

    const receipt = await tx.wait();

    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice;

    let fee = '0';
    if (gasPrice) {
      const totalFee = receipt.gasUsed * gasPrice;
      fee = formatEther(totalFee);
    }

    return {
      from: wallet.address,
      to,
      amount,
      hash: tx.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      fee,
    };
  }

  /**
   * Send REEF
   */
  async sendReef(
    user: User,
    amount: string,
    reciever: string,
    data: Partial<Transaction>,
    isUSD?: boolean,
    ensOrUsername?: string,
  ) {
    const decryptedEvmWallet = await this.walletService.decryptEvmWallet(
      process.env.DYNAMIC_WALLET_SECRET!,
      user.walletDetails,
    );

    const { formatted: balance } = await this.getBalance(
      user.walletAddress as `0x${string}`,
    );
    console.log('this is balance :', balance);

    if (isUSD) {
      const tokenDetails = await this.getTokenDetailsBasePrice('0x0');
      if (tokenDetails) {
        const price = parseFloat(tokenDetails.token_price_usd);
        const reefAmount = parseFloat(amount) / price;
        amount = reefAmount.toString();
      }
    }

    if (Number(balance) < Number(amount)) {
      return 'Insufficient balance.';
    }

    const wallet = this.getWallet(decryptedEvmWallet.privateKey);

    const tx = await wallet.sendTransaction({
      to: reciever,
      value: parseEther(amount),
    });

    const receipt = await tx.wait();

    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice;

    let fee = '0';
    if (gasPrice) {
      const totalFee = receipt.gasUsed * gasPrice;
      fee = formatEther(totalFee);
    }

    if (receipt.status === 1) {
      try {
        await new this.transactionModel({
          ...data,
          txHash: receipt.hash,
          blockHash: receipt.blockHash,
          blockNumber: receipt.blockNumber,
          gasFee: fee,
        }).save();
      } catch {}
      return `Sent ${amount} $REEF to ${ensOrUsername ? ensOrUsername : reciever}\n\nhttps://dev.papi.how/explorer/${receipt.blockHash}#networkId=localhost&endpoint=ws%3A%2F%2F34.123.142.246%3A9944`;
    }
    return;
  }

  /**
   * Estimate gas fee for a REEF transfer (without sending)
   */
  async estimateFee(pk: string, to: string, amount: string) {
    const wallet = this.getWallet(pk);

    const txReq = {
      to,
      value: parseEther(amount),
    };

    const gasEstimate = await wallet.estimateGas(txReq);

    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice;

    if (!gasPrice) {
      throw new Error('Gas price not available from provider');
    }

    const fee = gasEstimate * BigInt(gasPrice.toString());

    return {
      amount,
      fee: formatEther(fee),
    };
  }

  async getTokenDetailsBasePrice(
    targetId: string,
  ): Promise<ITokenPriceDetail | null> {
    try {
      const response = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/eth/tokens/${targetId === '0x0' ? '0xfe3e6a25e6b192a42a44ecddcd13796471735acf' : targetId}`,
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
}
