import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;
  private readonly isDev: boolean;

  constructor(private readonly config: ConfigService) {
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    this.isDev = config.get<string>('NODE_ENV', 'development') !== 'production';
  }

  async sendPasswordReset(email: string, rawToken: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${rawToken}`;

    if (this.isDev) {
      this.logger.log(`[DEV] Password reset for ${email} → ${resetUrl}`);
      return;
    }

    // Production: use SMTP via nodemailer
    // Install: npm install nodemailer @types/nodemailer
    // Then uncomment the block below and configure SMTP env vars:
    //
    // const nodemailer = await import('nodemailer');
    // const transporter = nodemailer.createTransporter({
    //   host: this.config.get('SMTP_HOST'),
    //   port: this.config.get<number>('SMTP_PORT', 587),
    //   auth: {
    //     user: this.config.get('SMTP_USER'),
    //     pass: this.config.get('SMTP_PASS'),
    //   },
    // });
    // await transporter.sendMail({
    //   from: this.config.get('SMTP_FROM', 'noreply@moneyflow.app'),
    //   to: email,
    //   subject: 'Reset Password Money Flow',
    //   html: `<p>Klik link berikut untuk reset password kamu (berlaku 1 jam):</p>
    //          <a href="${resetUrl}">${resetUrl}</a>`,
    // });

    this.logger.warn(`Email service not configured in production. Reset URL: ${resetUrl}`);
  }
}
