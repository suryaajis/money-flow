import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { InviteAccountDto } from './dto/invite-account.dto';
import { UpdateAccountShareDto } from './dto/update-account-share.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { SetActiveAccountDto } from './dto/set-active-account.dto';

type AuthRequest = { user: { id: string } };

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.accounts.findAll(req.user.id);
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateAccountDto) {
    return this.accounts.create(req.user.id, dto);
  }

  @Get('active')
  getActive(@Request() req: AuthRequest) {
    return this.accounts.getActiveAccount(req.user.id);
  }

  @Put('active')
  setActive(@Request() req: AuthRequest, @Body() dto: SetActiveAccountDto) {
    return this.accounts.setActiveAccount(req.user.id, dto.accountId);
  }

  @Patch(':id')
  update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accounts.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  archive(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.accounts.archive(req.user.id, id);
  }

  @Post(':id/adjustments')
  adjust(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: CreateAdjustmentDto,
  ) {
    return this.accounts.adjust(req.user.id, id, dto.amount, dto.reason);
  }

  @Get(':id/shares')
  listShares(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.accounts.listShares(req.user.id, id);
  }

  @Post(':id/shares')
  invite(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: InviteAccountDto,
  ) {
    return this.accounts.invite(req.user.id, id, dto.email, dto.role);
  }

  @Patch(':id/shares/:shareId')
  updateShare(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Param('shareId') shareId: string,
    @Body() dto: UpdateAccountShareDto,
  ) {
    return this.accounts.updateShareRole(req.user.id, id, shareId, dto.role);
  }

  @Delete(':id/shares/:shareId')
  @HttpCode(204)
  revokeShare(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Param('shareId') shareId: string,
  ) {
    return this.accounts.revokeShare(req.user.id, id, shareId);
  }
}

@Controller('account-invitations')
@UseGuards(JwtAuthGuard)
export class AccountInvitationsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(@Request() req: AuthRequest) {
    return this.accounts.listInvitations(req.user.id);
  }

  @Post(':token/accept')
  accept(@Request() req: AuthRequest, @Param('token') token: string) {
    return this.accounts.acceptInvitation(req.user.id, token);
  }

  @Post(':token/decline')
  @HttpCode(204)
  decline(@Request() req: AuthRequest, @Param('token') token: string) {
    return this.accounts.declineInvitation(req.user.id, token);
  }

  @Delete(':shareId/leave')
  @HttpCode(204)
  leave(@Request() req: AuthRequest, @Param('shareId') shareId: string) {
    return this.accounts.leave(req.user.id, shareId);
  }
}
