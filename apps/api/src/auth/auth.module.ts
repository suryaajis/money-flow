import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { PasswordResetToken } from './password-reset-token.entity';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    AccountsModule,
    PassportModule,
    TypeOrmModule.forFeature([PasswordResetToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        // Long-lived by default so the installed PWA keeps users signed in
        // across app restarts (override with JWT_EXPIRES_IN if needed).
        signOptions: {
          expiresIn: config.get<string>(
            'JWT_EXPIRES_IN',
            '30d',
          ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
