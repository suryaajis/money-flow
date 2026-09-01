import {
  Controller,
  Body,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WhatsappService } from './whatsapp.service';
import type { Request as ExpressRequest } from 'express';
import { CreateWaLinkChallengeDto } from './dto/create-wa-link-challenge.dto';
import { UpdateWaPhoneLinkDto } from './dto/update-wa-phone-link.dto';
import { UnlinkWaPhoneDto } from './dto/unlink-wa-phone.dto';

type AuthenticatedRequest = ExpressRequest & { user: { id: string } };

@Controller('users/whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappSettingsController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get()
  getStatus(@Request() req: AuthenticatedRequest) {
    return this.whatsappService.getLinkStatus(req.user.id);
  }

  @Get('numbers')
  getNumbers(@Request() req: AuthenticatedRequest) {
    return this.whatsappService.getLinkStatus(req.user.id);
  }

  @Post('link')
  createLinkChallenge(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateWaLinkChallengeDto,
  ) {
    return this.whatsappService.createLinkChallenge(req.user.id, dto.label);
  }

  @Post('numbers/challenge')
  createNumberChallenge(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateWaLinkChallengeDto,
  ) {
    return this.whatsappService.createLinkChallenge(req.user.id, dto.label);
  }

  @Patch('numbers/:id')
  updateNumber(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateWaPhoneLinkDto,
  ) {
    return this.whatsappService.updatePhoneLink(req.user.id, id, dto);
  }

  @Post('numbers/:id/primary')
  setPrimary(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.whatsappService.setPrimaryPhone(req.user.id, id);
  }

  @Delete('numbers/:id')
  @HttpCode(204)
  unlinkNumber(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UnlinkWaPhoneDto,
  ) {
    return this.whatsappService.unlinkPhone(req.user.id, dto.password, id);
  }

  @Delete('link')
  @HttpCode(204)
  unlinkPhone(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UnlinkWaPhoneDto,
  ) {
    return this.whatsappService.unlinkPhone(req.user.id, dto.password);
  }
}
