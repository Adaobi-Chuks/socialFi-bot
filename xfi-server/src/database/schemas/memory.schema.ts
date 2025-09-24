// memory.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type MemoryDocument = mongoose.HydratedDocument<Memory>;

@Schema({ timestamps: true })
export class Memory {
  @Prop({ default: uuidv4 })
  id: string;

  @Prop({ required: true })
  roomId: string;

  @Prop({ type: [Number], required: true })
  embedding: number[];

  @Prop()
  content: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const MemorySchema = SchemaFactory.createForClass(Memory);
