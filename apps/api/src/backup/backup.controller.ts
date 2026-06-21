import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BackupService } from './backup.service';

interface AuthRequest {
  user: { id: string; email: string; name: string };
}

@Controller('backup')
@UseGuards(JwtAuthGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('export')
  export(@Request() req: AuthRequest) {
    return this.backupService.export(req.user.id);
  }

  @Post('import')
  import(
    @Request() req: AuthRequest,
    @Body()
    body: {
      data: { transactions: any[]; categories: any[] };
      mode: 'merge' | 'replace';
    },
  ) {
    return this.backupService.import(req.user.id, body.data, body.mode);
  }
}
