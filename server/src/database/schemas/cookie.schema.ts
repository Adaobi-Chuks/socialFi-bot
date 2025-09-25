import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type CookiesDocument = mongoose.HydratedDocument<Cookies>;

@Schema({ timestamps: true })
export class Cookies {
  @Prop({ default: uuidv4, unique: true })
  userId: string;

  @Prop({ required: true })
  cookies: any[];
}

export const CookiesSchema = SchemaFactory.createForClass(Cookies);
