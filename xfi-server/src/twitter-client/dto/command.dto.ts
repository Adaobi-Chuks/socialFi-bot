import { ApiProperty } from '@nestjs/swagger';

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
}
