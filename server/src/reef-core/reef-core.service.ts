import { Injectable } from '@nestjs/common';
import {
    JsonRpcProvider,
    Wallet,
    formatEther,
    parseEther,
} from 'ethers';

@Injectable()
export class ReefCoreService {
    private readonly provider: JsonRpcProvider;

    constructor() {
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
            formatted: formatEther(raw)
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
            fee
        };
    }

    /**
     * Estimate gas fee for a REEF transfer (without sending)
     */
    async estimateFee(pk: string, to: string, amount: string) {
        const wallet = this.getWallet(pk);

        const txReq = {
            to,
            value: parseEther(amount)
        };

        const gasEstimate = await wallet.estimateGas(txReq);

        const feeData = await this.provider.getFeeData();
        const gasPrice = feeData.gasPrice;

        if (!gasPrice) {
            throw new Error("Gas price not available from provider");
        }

        const fee = gasEstimate * BigInt(gasPrice.toString());

        return {
            amount,
            fee: formatEther(fee)
        };
    }
}