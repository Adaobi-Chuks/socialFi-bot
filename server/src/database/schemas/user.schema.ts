import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type UserDocument = mongoose.HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ default: uuidv4, unique: true })
  userId: string;

  @Prop()
  userName: string;

  @Prop()
  displayName: string;

  @Prop()
  profileImage: string;

  @Prop()
  walletAddress: string;

  @Prop()
  walletDetails: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    type: [String],
    enum: ['sei', 'ethereum'],
    default: ['sei'],
  })
  chains: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// // user.schema.ts
// import { Schema, Document } from 'mongoose';

// export interface UserDocument extends Document {
//   _id: string;
//   name: string;
//   phone?: string;
//   avatar?: { url: string; publicId: string };
//   lastSeen?: Date;
//   pushTokens?: string[]; // for push notifications
// }

// export const UserSchema = new Schema({
//   name: { type: String, required: true },
//   phone: String,
//   avatar: { url: String, publicId: String },
//   lastSeen: Date,
//   pushTokens: [String],
// });
