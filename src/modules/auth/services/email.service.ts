import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const RESEND_API_URL = 'https://api.resend.com/emails';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('RESEND_API_KEY', '');
    this.from = this.config.get<string>('RESEND_FROM_EMAIL', 'noreply@onmec.ci');
  }

  async sendEmailVerificationOtp(email: string, fullname: string, otp: string): Promise<void> {
    try {
      await axios.post(
        RESEND_API_URL,
        {
          from: `ONMEC <${this.from}>`,
          to: [email],
          subject: `Votre code de vérification ONMEC : ${otp}`,
          html: this.buildOtpEmail(fullname, otp),
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log({ action: 'EMAIL_OTP_SENT', email });
    } catch (error: any) {
      this.logger.error(
        'Erreur envoi email OTP via Resend',
        error?.response?.data ?? error?.message,
      );
      throw new Error("Impossible d'envoyer l'email de vérification");
    }
  }

  async sendPasswordResetOtp(email: string, fullname: string, otp: string): Promise<void> {
    try {
      await axios.post(
        RESEND_API_URL,
        {
          from: `ONMEC <${this.from}>`,
          to: [email],
          subject: `Réinitialisation de votre mot de passe ONMEC : ${otp}`,
          html: this.buildPasswordResetEmail(fullname, otp),
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log({ action: 'EMAIL_PASSWORD_RESET_SENT', email });
    } catch (error: any) {
      this.logger.error(
        'Erreur envoi email de réinitialisation via Resend',
        error?.response?.data ?? error?.message,
      );
      throw new Error("Impossible d'envoyer l'email de réinitialisation");
    }
  }

  private buildPasswordResetEmail(fullname: string, otp: string): string {
    return `
      <!DOCTYPE html>
      <html lang="fr">
      <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f9f9f9;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:40px 0;">
              <table width="600" cellpadding="0" cellspacing="0"
                     style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
                <tr>
                  <td style="background:#1a56db;padding:24px 32px;">
                    <h1 style="margin:0;color:#fff;font-size:22px;">ONMEC</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <p style="font-size:16px;color:#333;">Bonjour <strong>${fullname}</strong>,</p>
                    <p style="font-size:15px;color:#555;"
                    >Vous avez demandé la réinitialisation de votre mot de passe. Entrez le code ci-dessous pour en définir un nouveau :</p>
                    <div style="text-align:center;margin:32px 0;">
                      <span style="
                        display:inline-block;
                        background:#f0f4ff;
                        border:2px dashed #1a56db;
                        border-radius:8px;
                        padding:16px 32px;
                        font-size:40px;
                        font-weight:bold;
                        letter-spacing:12px;
                        color:#1a56db;
                      ">${otp}</span>
                    </div>
                    <p style="font-size:14px;color:#777;text-align:center;">
                      Ce code est valable <strong>10 minutes</strong>.
                    </p>
                    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
                    <p style="font-size:12px;color:#aaa;text-align:center;">
                      Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe restera inchangé.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private buildOtpEmail(fullname: string, otp: string): string {
    return `
      <!DOCTYPE html>
      <html lang="fr">
      <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f9f9f9;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:40px 0;">
              <table width="600" cellpadding="0" cellspacing="0"
                     style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
                <tr>
                  <td style="background:#1a56db;padding:24px 32px;">
                    <h1 style="margin:0;color:#fff;font-size:22px;">ONMEC</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <p style="font-size:16px;color:#333;">Bonjour <strong>${fullname}</strong>,</p>
                    <p style="font-size:15px;color:#555;"
                    >Pour finaliser la création de votre compte, entrez le code ci-dessous :</p>
                    <div style="text-align:center;margin:32px 0;">
                      <span style="
                        display:inline-block;
                        background:#f0f4ff;
                        border:2px dashed #1a56db;
                        border-radius:8px;
                        padding:16px 32px;
                        font-size:40px;
                        font-weight:bold;
                        letter-spacing:12px;
                        color:#1a56db;
                      ">${otp}</span>
                    </div>
                    <p style="font-size:14px;color:#777;text-align:center;">
                      Ce code est valable <strong>10 minutes</strong>.
                    </p>
                    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
                    <p style="font-size:12px;color:#aaa;text-align:center;">
                      Si vous n'avez pas créé de compte sur ONMEC, ignorez cet email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}
