import {
  Controller,
  Get,
  Post,
  Delete,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WhatsappService } from './whatsapp.service';
import type { Request as ExpressRequest } from 'express';

type AuthenticatedRequest = ExpressRequest & { user: { id: string } };

@Controller('users/whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappSettingsController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get()
  getStatus(@Request() req: AuthenticatedRequest) {
    return this.whatsappService.getLinkStatus(req.user.id);
  }

  @Post('link')
  createLinkChallenge(@Request() req: AuthenticatedRequest) {
    return this.whatsappService.createLinkChallenge(req.user.id);
  }

  @Delete('link')
  @HttpCode(204)
  unlinkPhone(@Request() req: AuthenticatedRequest) {
    return this.whatsappService.unlinkPhone(req.user.id);
  }
}
