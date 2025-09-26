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
}
