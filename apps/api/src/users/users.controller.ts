import {
  Body,
  Controller,
  Delete,
  Get,
  Put,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

type JwtUser = { id: string; email: string; name: string };

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req: { user: JwtUser }) {
    const user = await this.usersService.findById(req.user.id);
    return { id: user!.id, email: user!.email, name: user!.name };
  }

  @Put('profile')
  async updateProfile(
    @Request() req: { user: JwtUser },
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.usersService.updateName(req.user.id, dto.name);
    return { id: updated.id, email: updated.email, name: updated.name };
  }

  @Put('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Request() req: { user: JwtUser },
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(req.user.id, dto.oldPassword, dto.newPassword);
  }

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@Request() req: { user: JwtUser }) {
    await this.usersService.deleteAccount(req.user.id);
  }
}
