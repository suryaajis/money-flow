import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;
  private readonly isDev: boolean;
  private readonly transporter: Transporter | null;

  constructor(private readonly config: ConfigService) {
    this.frontendUrl = config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    this.isDev = config.get<string>('NODE_ENV', 'development') !== 'production';
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: Number(config.get<string>('SMTP_PORT', '587')),
          secure: config.get<string>('SMTP_SECURE', 'false') === 'true',
          auth: user && pass ? { user, pass } : undefined,
          connectionTimeout: 10_000,
          socketTimeout: 15_000,
        })
      : null;
  }

  async sendPasswordReset(email: string, rawToken: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${rawToken}`;

    if (this.isDev) {
      this.logger.log(`[DEV] Password reset for ${email} → ${resetUrl}`);
      return;
    }

    if (!this.transporter) {
      throw new Error(
        'SMTP_HOST wajib dikonfigurasi pada environment production',
      );
    }
    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM', 'noreply@moneyflow.app'),
      to: email,
      subject: 'Reset Password Money Flow',
      text: `Reset password Money Flow melalui link berikut (berlaku 1 jam): ${resetUrl}`,
      html: `<p>Reset password Money Flow melalui link berikut (berlaku 1 jam):</p><p><a href="${resetUrl}">Reset password</a></p>`,
    });
    this.logger.log(`Password reset email sent to ${this.maskEmail(email)}`);
  }

  async sendAccountInvitation(
    email: string,
    rawToken: string,
    accountName: string,
  ): Promise<void> {
    const inviteUrl = `${this.frontendUrl}/accounts/invitations?token=${encodeURIComponent(rawToken)}`;
    if (this.isDev) {
      this.logger.log(`[DEV] Account invitation for ${email} → ${inviteUrl}`);
      return;
    }
    if (!this.transporter) {
      throw new Error(
        'SMTP_HOST wajib dikonfigurasi pada environment production',
      );
    }
    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM', 'noreply@moneyflow.app'),
      to: email,
      subject: `Undangan account ${accountName} di Money Flow`,
      text: `Kamu diundang ke account ${accountName}. Terima undangan dalam 24 jam: ${inviteUrl}`,
      html: `<p>Kamu diundang ke account <strong>${accountName}</strong>.</p><p><a href="${inviteUrl}">Terima undangan</a> (berlaku 24 jam)</p>`,
    });
    this.logger.log(`Account invitation sent to ${this.maskEmail(email)}`);
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }
}
