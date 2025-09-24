import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
} from '@nestjs/swagger';
import { CreateUserDto } from 'src/twitter-client/dto/user.dto';
import { UserResponseDto } from 'src/twitter-client/dto/response.dto';

export class AuthResponseDto {
  @ApiProperty({
    description: 'State if the user is authenticated',
    example: true,
  })
  authenticated: boolean;

  @ApiProperty({ type: () => UserResponseDto })
  user: UserResponseDto;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Signin a user using twitter' })
  @ApiBody({ type: CreateUserDto })
  @ApiOkResponse({ type: AuthResponseDto })
  async authenticateUser(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.authenticate(createUserDto);

    const isProduction = process.env.NODE_ENV === 'production';
    console.log('isProduction', isProduction);

    res.cookie('auth_token', authResponse.jwt, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { authenticated: true, user: authResponse.user };
  }
}
