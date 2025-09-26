import { ApiProperty } from '@nestjs/swagger';

export type Platform = 'twitter' | 'twitter-dm' | 'terminal';

export class CommandDto {
  @ApiProperty({
    type: String,
    required: true,
    example: '134666482662882',
    description: 'user twitter id',
  })
  userId: string;

  @ApiProperty({
    type: String,
    required: true,
    example: 'tip 0.01 sei to ekete.eth',
    description: 'bot prompt command',
  })
  prompt: string;

  @ApiProperty({
    enum: ['twitter', 'twitter-dm', 'terminal'],
    required: true,
    example: 'twitter',
    description: 'Platform where the bot command is executed',
  })
  platform?: Platform;
}
