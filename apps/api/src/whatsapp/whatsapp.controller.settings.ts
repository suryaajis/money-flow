import { Controller, Get, Post, Delete, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WhatsappService } from './whatsapp.service';

@Controller('users/whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappSettingsController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get()
  getStatus(@Request() req: any) {
    return this.whatsappService.getLinkStatus(req.user.id);
  }

  @Post('link')
  linkPhone(@Request() req: any, @Body() body: { phone: string }) {
    return this.whatsappService.linkPhone(req.user.id, body.phone);
  }

  @Delete('link')
  @HttpCode(204)
  unlinkPhone(@Request() req: any) {
    return this.whatsappService.unlinkPhone(req.user.id);
  }
}
