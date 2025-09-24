import { Injectable } from '@nestjs/common';
import * as multichainWallet from 'multichain-crypto-wallet';
import { createHash } from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class WalletService {
  private generateKey(password: string): Buffer {
    return createHash('sha256').update(password).digest();
  }

  createEvmWallet = (): Record<string, any> => {
    const wallet = multichainWallet.createWallet({
      network: 'ethereum',
    });

    return wallet;
  };

  getEvmAddressFromPrivateKey = (
    privateKey: string,
  ): Record<string, string> => {
    const wallet = multichainWallet.getAddressFromPrivateKey({
      privateKey,
      network: 'ethereum',
    });

    return wallet;
  };

  encryptEvmWallet = async (
    password: string,
    privateKey: string,
  ): Promise<Record<string, string>> => {
    const encrypted = await multichainWallet.getEncryptedJsonFromPrivateKey({
      network: 'ethereum',
      privateKey,
      password,
    });
    return encrypted;
  };

  decryptEvmWallet = async (
    password: string,
    encryptedWallet: string,
  ): Promise<Record<string, string>> => {
    const decrypted = await multichainWallet.getWalletFromEncryptedJson({
      network: 'ethereum',
      json: encryptedWallet,
      password,
    });
    return decrypted;
  };

  getNativeEthBalance = async (
    address: string,
    rpc: string,
  ): Promise<Record<string, number>> => {
    const balance = await multichainWallet.getBalance({
      address,
      network: 'ethereum',
      rpcUrl: rpc,
    });
    return balance;
  };

  getERC20Balance = async (
    address: string,
    tokenAddress: string,
    rpc: string,
  ): Promise<Record<string, number>> => {
    const balance = await multichainWallet.getBalance({
      address,
      network: 'ethereum',
      rpcUrl: rpc,
      tokenAddress: tokenAddress,
    });
    return balance;
  };

  transferEth = async (
    privateKey: string,
    recipientAddress: string,
    amount: number,
    rpcURL: string,
    description?: string,
  ): Promise<Record<any, unknown>> => {
    const transer = await multichainWallet.transfer({
      recipientAddress,
      amount,
      network: 'ethereum',
      rpcUrl: rpcURL,
      privateKey,
      // gasPrice: '20', // TODO: increase this for faster transaction
      data: description || '',
    });

    return transer;
  };

  transferERC20 = async (
    privateKey: string,
    recipientAddress: string,
    tokenAddress: string,
    amount: number,
    rpcURL: string,
    description?: string,
  ): Promise<Record<any, unknown>> => {
    const transer = await multichainWallet.transfer({
      recipientAddress,
      amount,
      network: 'ethereum',
      rpcUrl: rpcURL,
      privateKey,
      // gasPrice: '20', // TODO: increase this for faster transaction
      tokenAddress: tokenAddress,
      data: description || '',
    });

    return transer;
  };
}
