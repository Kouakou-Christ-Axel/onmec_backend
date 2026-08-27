import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
    const html = this.buildEmail(
      fullname,
      otp,
      'Pour finaliser la création de votre compte, entrez le code ci-dessous :',
      "Si vous n'avez pas créé de compte sur Citoyen+, ignorez cet email.",
    );

    await this.send(
      email,
      `Votre code de vérification Citoyen+ : ${otp}`,
      html,
      'EMAIL_OTP_SENT',
      'Erreur envoi email OTP via Resend',
      "Impossible d'envoyer l'email de vérification",
    );
  }

  async sendPasswordResetOtp(email: string, fullname: string, otp: string): Promise<void> {
    const html = this.buildEmail(
      fullname,
      otp,
      'Vous avez demandé la réinitialisation de votre mot de passe. Entrez le code ci-dessous pour en définir un nouveau :',
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe restera inchangé.",
    );

    await this.send(
      email,
      `Réinitialisation de votre mot de passe Citoyen+ : ${otp}`,
      html,
      'EMAIL_PASSWORD_RESET_SENT',
      'Erreur envoi email de réinitialisation via Resend',
      "Impossible d'envoyer l'email de réinitialisation",
    );
  }

  private async send(
    to: string,
    subject: string,
    html: string,
    action: string,
    logMessage: string,
    erreur: string,
  ): Promise<void> {
    try {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Citoyen+ <${this.from}>`,
          to: [to],
          subject,
          html,
        }),
      });

      // `fetch` ne rejette pas sur un statut HTTP d'erreur (contrairement a
      // axios) : sans ce controle explicite, un echec d'envoi Resend passerait
      // silencieusement pour un succes.
      if (!response.ok) {
        const body = await response.json().catch(() => undefined);
        throw Object.assign(new Error(response.statusText), { body });
      }

      this.logger.log({ action, email: to });
    } catch (error: any) {
      this.logger.error(logMessage, error?.body ?? error?.message);
      throw new Error(erreur);
    }
  }

  private buildEmail(fullname: string, otp: string, intro: string, footer: string): string {
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
                    <h1 style="margin:0;color:#fff;font-size:22px;">Citoyen+</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <p style="font-size:16px;color:#333;">Bonjour <strong>${fullname}</strong>,</p>
                    <p style="font-size:15px;color:#555;"
                    >${intro}</p>
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
                      ${footer}
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
