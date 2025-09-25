import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/database/schemas/user.schema';
import { CreateUserDto } from 'src/twitter-client/dto/user.dto';
import { UserService } from 'src/twitter-client/user.service';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);
  private readonly saltRounds = 10;
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UserService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async authenticate(userData: CreateUserDto) {
    let user = await this.userModel
      .findOne({ userId: userData.userId })
      .select('-walletDetails')
      .exec();
    if (!user) {
      this.logger.log(
        `User with ID ${userData.userId} not found. Creating new user.`,
      );
      user = await this.usersService.createUser(userData);
    } else {
      this.logger.log(`User with ID ${userData.userId} found.`);
      if (user.userName !== userData.userName) {
        this.logger.log(
          `Username mismatch for user ID ${userData.userId}. Updating username to ${userData.userName}.`,
        );
        if (userData.profileImage) {
          await this.userModel.findOneAndUpdate(
            { userId: user.userId },
            { profileImage: userData.profileImage },
          );
        }
        user.userName = userData.userName;
        await user.save();
      }
    }

    const jwt = await this.generateJwt(user);
    return { jwt, user };
  }

  async generateJwt(user: UserDocument) {
    const payload = {
      sub: user.userId,
      username: user.userName,
      userId: user.userId,
    };

    return this.jwtService.sign(payload);
  }
}
