// src/email/resend.ts
import { Resend } from "resend";
import { elizaLogger } from "@elizaos/core";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_DEFAULT = "Grand Villa scheduler <onboarding@resend.dev>";

/**
 * Sends the password reset email via Resend.
 * @param to   Recipient email (user's email)
 * @param link Frontend reset URL including ?token=...
 * @returns true on success, throws on failure
 */
export async function sendPasswordResetEmail(to: string, link: string) {
  const from = (process.env.RESEND_FROM || FROM_DEFAULT).trim();

  try {
    elizaLogger.info(
      `[Resend] key present=${Boolean(process.env.RESEND_API_KEY)}, from=${from}, to=${to}`
    );

    const subject = "Reset your password";
    const text = `We received a request to reset your password.

Click this link to reset it:
${link}

This link expires in 30 minutes. If you didn't request this, you can ignore this email.`;

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light only" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif;background:#f7f7f8;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ececec;border-radius:10px;padding:24px;">
      <h1 style="font-size:20px;margin:0 0 12px;">Reset your password</h1>
      <p style="margin:0 0 16px;color:#333;">
        We received a request to reset your password. Click the button below to continue.
      </p>
      <p style="margin:0 0 16px;">
        <a href="${link}" style="display:inline-block;padding:10px 16px;border-radius:8px;border:1px solid #ff5a8a;text-decoration:none;">
          Reset password
        </a>
      </p>
      <p style="margin:0 0 8px;color:#666;">Or copy this link into your browser:</p>
      <p style="margin:0 0 16px;word-break:break-all;"><a href="${link}">${link}</a></p>
      <p style="margin:0;color:#999;font-size:12px;">This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  </body>
</html>`;

    const { data, error } = await resend.emails.send({
      from,
      to, // string or string[]
      subject,
      text,
      html,
    });

    if (error) {
      elizaLogger.error(
        `[Resend] send failed for ${to}: ${JSON.stringify(error)}`
      );
      throw new Error(error?.message || "Resend send failed");
    }

    elizaLogger.info(
      `[Resend] email queued to ${to} (id: ${data?.id || "no-id"})`
    );
    return true;
  } catch (err) {
    elizaLogger.error(`[Resend] exception for ${to}: ${String(err)}`);
    throw err;
  }
}
