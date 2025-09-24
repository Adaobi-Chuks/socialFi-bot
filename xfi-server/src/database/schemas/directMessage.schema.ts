import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type DirectMessageDocument = mongoose.HydratedDocument<DirectMessage>;

@Schema()
export class DirectMessage {
  @Prop({ required: true, unique: true })
  messageId: string;

  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  @Prop()
  content: string;

  @Prop()
  senderId: string;

  @Prop()
  recipientId: string;

  @Prop()
  createdAt: string;

  @Prop()
  senderScreenName: string;

  @Prop()
  recipientScreenName: string;
}

export const DirectMessageSchema = SchemaFactory.createForClass(DirectMessage);
