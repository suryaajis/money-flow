import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(email: string, name: string, password: string): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = this.userRepository.create({ email, name, password: hashed });
    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userRepository.update(userId, { password: hashed });
  }
}
