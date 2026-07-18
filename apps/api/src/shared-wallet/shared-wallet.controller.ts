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
import { CreateTransactionDto } from '../transactions/dto/create-transaction.dto';

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

  // SHARE-04: names for resolving `recordedBy` on my own wallet's transactions
  @Get('recorders')
  getRecorders(@Request() req: any) {
    return this.sharedWalletService.getRecorders(req.user.id);
  }

  // SHARE-03: owner's categories, for composing a transaction into their wallet
  @Get(':ownerId/categories')
  getOwnerCategories(@Request() req: any, @Param('ownerId') ownerId: string) {
    return this.sharedWalletService.getOwnerCategories(req.user.id, ownerId);
  }

  // SHARE-03: record a transaction into a shared wallet I'm a member of
  @Post(':ownerId/transactions')
  recordForOwner(
    @Request() req: any,
    @Param('ownerId') ownerId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.sharedWalletService.recordForOwner(req.user.id, ownerId, dto);
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
