import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type TransactionDocument = mongoose.HydratedDocument<Transaction>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Transaction {
  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  @Prop({ type: String, enum: ['send', 'tip', 'drop'], required: true })
  transactionType: 'send' | 'tip' | 'drop';

  @Prop({
    type: String,
    enum: ['reef', 'ethereum'],
    required: true,
  })
  chain: 'reef' | 'ethereum';

  @Prop({ required: true })
  amount: string;

  @Prop({
    type: {
      address: { type: String, required: true },
      tokenType: {
        type: String,
        enum: ['native', 'stable', 'token'],
        required: true,
      },
    },
    required: true,
  })
  token: {
    address: string;
    tokenType: 'native' | 'stable' | 'token';
  };

  @Prop({
    type: {
      value: { type: String },
      receiverType: { type: String, enum: ['wallet', 'ens', 'username'] },
    },
    required: false,
  })
  receiver?: {
    value: string;
    receiverType: 'wallet' | 'ens' | 'username';
  };

  @Prop({ type: String, ref: 'User', required: false })
  receiverUserId?: string;

  @Prop()
  tokenIn?: string;

  @Prop()
  tokenOut?: string;

  @Prop({ type: String })
  txHash?: string;

  @Prop({ type: String })
  blockNumber?: string;

  @Prop({ type: String })
  blockHash?: string;

  @Prop({ type: String })
  gasFee?: string;

  // @Prop({
  //   type: String,
  //   enum: ['pending', 'confirmed', 'failed'],
  //   default: 'pending',
  // })
  // status: 'pending' | 'confirmed' | 'failed';

  @Prop({
    type: {
      platform: { type: String },
      originalCommand: { type: String },
    },
    required: false,
  })
  meta?: {
    platform?: string;
    originalCommand?: string;
  };

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
