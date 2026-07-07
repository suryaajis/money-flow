import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { PasswordResetToken } from './password-reset-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepo: Repository<PasswordResetToken>,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto.email, dto.name, dto.password);
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return {
      accessToken: token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Email atau password salah');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Email atau password salah');

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return {
      accessToken: token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  getProfile(user: { id: string; email: string; name: string }) {
    return user;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    // Always return success even if email not found (security)
    const user = await this.usersService.findByEmail(email);
    if (user) {
      // Invalidate old tokens for this user
      await this.resetTokenRepo.delete({ userId: user.id });

      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      const resetToken = this.resetTokenRepo.create({
        userId: user.id,
        token: hashed,
        expiresAt,
        usedAt: null,
      });
      await this.resetTokenRepo.save(resetToken);
      await this.emailService.sendPasswordReset(email, rawToken);
    }

    return { message: 'Jika email terdaftar, link reset password telah dikirim.' };
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<{ message: string }> {
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    const record = await this.resetTokenRepo.findOne({ where: { token: hashed } });

    if (!record) throw new BadRequestException('Link reset password tidak valid');
    if (record.usedAt) throw new BadRequestException('Link sudah pernah digunakan');
    if (record.expiresAt < new Date()) throw new BadRequestException('Link sudah kadaluarsa');

    await this.usersService.updatePassword(record.userId, newPassword);
    record.usedAt = new Date();
    await this.resetTokenRepo.save(record);

    return { message: 'Password berhasil direset. Silakan login.' };
  }
}
