import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ParseCommandService } from './parse-command';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { CommandDto } from './dto/command.dto';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PromptResponseDto } from './dto/response.dto';
import { IntentDetectionService } from 'src/intent-detection/intent-detection.service';

@Controller('bot-command')
export class TwitterClientController {
  constructor(
    private readonly handleDefiService: ParseCommandService,
    private readonly intentService: IntentDetectionService,
  ) {}
  @Post()
  // @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send Command to the bot' })
  @ApiOkResponse({ type: PromptResponseDto })
  async prompt(@Body() commandDto: CommandDto, @Req() req: any) {
    // const userId = req.user.sub;
    // if (userId !== commandDto.userId) {
    //   return { error: 'Unauthorized user' };
    // }
    const data = await this.handleDefiService.handleTweetCommand(
      commandDto.prompt,
      commandDto.userId,
      undefined,
      'terminal',
    );

    return { response: data };
  }

  @Post('from-twitter')
  @ApiOperation({ summary: 'Send Command to the bot via twitter' })
  @ApiOkResponse({ type: PromptResponseDto })
  async fromTwitter(@Body() commandDto: CommandDto) {
    const data = await this.handleDefiService.handleTweetCommand(
      commandDto.prompt,
      commandDto.userId,
      undefined,
      'twitter',
    );

    return data;
  }

  @Post('intent')
  @ApiOperation({ summary: 'get command intent' })
  @ApiOkResponse({ type: PromptResponseDto })
  async intent(@Body() commandDto: CommandDto) {
    const data = await this.intentService.aiIntentDetector(commandDto.prompt);

    return data;
  }
}
