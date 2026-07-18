import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SharedWalletService } from './shared-wallet.service';

@Controller('shared-wallet')
@UseGuards(JwtAuthGuard)
export class SharedWalletController {
  constructor(private readonly sharedWalletService: SharedWalletService) {}

  // My wallet's members
  @Get('members')
  getMyMembers(@Request() req: any) {
    return this.sharedWalletService.getMyMembers(req.user.id);
  }

  // Wallets shared with me
  @Get('shared-with-me')
  getSharedWithMe(@Request() req: any) {
    return this.sharedWalletService.getSharedWithMe(req.user.id);
  }

  @Post('invite')
  invite(@Request() req: any, @Body() body: { email: string }) {
    return this.sharedWalletService.inviteByEmail(req.user.id, body.email);
  }

  @Post('accept/:token')
  accept(@Request() req: any, @Param('token') token: string) {
    return this.sharedWalletService.acceptInvite(token, req.user.id);
  }

  @Delete('members/:id')
  @HttpCode(204)
  removeMember(@Request() req: any, @Param('id') id: string) {
    return this.sharedWalletService.removeMember(req.user.id, id);
  }

  @Delete('leave/:id')
  @HttpCode(204)
  leave(@Request() req: any, @Param('id') id: string) {
    return this.sharedWalletService.leaveWallet(req.user.id, id);
  }
}
