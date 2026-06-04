import "server-only";

import { formatInTimeZone } from "date-fns-tz";
import { EMAIL_FROM, resend } from "@/lib/email";
import { logger } from "@/lib/logger";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSlot(start: Date, end: Date, timezone: string): string {
  const date = formatInTimeZone(start, timezone, "EEEE, MMMM d, yyyy");
  const startTime = formatInTimeZone(start, timezone, "h:mm a");
  const endTime = formatInTimeZone(end, timezone, "h:mm a");
  return `${date} · ${startTime}–${endTime} (${timezone})`;
}

function htmlWrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <!-- Logo row -->
          <tr>
            <td style="padding-bottom:28px;">
              <span style="font-size:13px;font-weight:700;letter-spacing:0.18em;color:#2B2B2B;">GATE</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;border:1px solid #E4DED4;padding:40px 36px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:20px;text-align:center;font-size:12px;color:#9CA3AF;">
              You're receiving this because you interacted with a GATE-powered booking page.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function accentDot(): string {
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#DFA767;margin-right:8px;vertical-align:middle;"></span>`;
}

function slotBox(slotText: string): string {
  return `<div style="margin:20px 0;padding:14px 18px;background:#FFF9F2;border:1px solid #DFA767;border-radius:12px;font-size:14px;color:#2B2B2B;">
    ${accentDot()}<strong>${slotText}</strong>
  </div>`;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!resend) {
    logger.warn("Resend not configured — email skipped", {
      to: params.to,
      subject: params.subject,
    });
    return;
  }

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } catch (err) {
    logger.error("Email send failed", {
      err,
      to: params.to,
      subject: params.subject,
    });
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export const emailService = {
  /**
   * Sent to the visitor immediately after their hold is created.
   * If requiresApproval is true → "pending review" messaging.
   * If false → "confirmed, check your inbox" messaging.
   */
  async sendHoldCreatedVisitor(params: {
    to: string;
    visitorName: string;
    professionalName: string;
    serviceTitle: string;
    slotStart: Date;
    slotEnd: Date;
    timezone: string;
    holdId: string;
    expiresAt: Date;
    requiresApproval: boolean;
    appUrl: string;
  }): Promise<void> {
    const slot = formatSlot(params.slotStart, params.slotEnd, params.timezone);
    const expiryTime = formatInTimeZone(params.expiresAt, params.timezone, "h:mm a");
    const statusUrl = `${params.appUrl}/booking/${params.holdId}`;

    const headline = params.requiresApproval
      ? "Your request has been received."
      : "Your slot is confirmed!";

    const body = params.requiresApproval
      ? `<p style="margin:0 0 8px;font-size:14px;color:#6B7280;">Hi ${params.visitorName},</p>
         <p style="margin:0 0 16px;font-size:14px;color:#6B7280;">
           <strong style="color:#2B2B2B;">${params.professionalName}</strong> will review your booking request for
           <strong style="color:#2B2B2B;">${params.serviceTitle}</strong> and get back to you within 24 hours.
         </p>
         ${slotBox(slot)}
         <p style="margin:0 0 24px;font-size:13px;color:#9CA3AF;">
           Your slot is temporarily reserved until ${expiryTime} while the request is reviewed.
         </p>`
      : `<p style="margin:0 0 8px;font-size:14px;color:#6B7280;">Hi ${params.visitorName},</p>
         <p style="margin:0 0 16px;font-size:14px;color:#6B7280;">
           Your booking with <strong style="color:#2B2B2B;">${params.professionalName}</strong> for
           <strong style="color:#2B2B2B;">${params.serviceTitle}</strong> is confirmed.
           A calendar invite will arrive shortly.
         </p>
         ${slotBox(slot)}`;

    const subject = params.requiresApproval
      ? `Booking request received — ${params.serviceTitle}`
      : `Booking confirmed — ${params.serviceTitle}`;

    await sendEmail({
      to: params.to,
      subject,
      html: htmlWrapper(
        subject,
        `<h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#2B2B2B;line-height:1.2;">${headline}</h1>
         ${body}
         <a href="${statusUrl}" style="display:inline-block;padding:12px 24px;background:#2B2B2B;color:#ffffff;text-decoration:none;border-radius:100px;font-size:14px;font-weight:600;">
           View Booking Status
         </a>`,
      ),
    });
  },

  /**
   * Sent to the professional when a visitor creates a hold that requires
   * manual approval.
   */
  async sendNewBookingRequestProfessional(params: {
    to: string;
    professionalName: string;
    visitorName: string;
    visitorEmail: string;
    serviceTitle: string;
    slotStart: Date;
    slotEnd: Date;
    timezone: string;
    holdId: string;
    appUrl: string;
  }): Promise<void> {
    const slot = formatSlot(params.slotStart, params.slotEnd, params.timezone);
    const approveUrl = `${params.appUrl}/app/bookings`;

    const subject = `New booking request from ${params.visitorName}`;
    await sendEmail({
      to: params.to,
      subject,
      html: htmlWrapper(
        subject,
        `<h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#2B2B2B;">New booking request</h1>
         <p style="margin:0 0 16px;font-size:14px;color:#6B7280;">
           <strong style="color:#2B2B2B;">${params.visitorName}</strong>
           (<a href="mailto:${params.visitorEmail}" style="color:#DFA767;">${params.visitorEmail}</a>)
           has requested a <strong style="color:#2B2B2B;">${params.serviceTitle}</strong> session.
         </p>
         ${slotBox(slot)}
         <p style="margin:0 0 24px;font-size:13px;color:#9CA3AF;">
           This slot is temporarily held while you review the request. Approve or decline from your dashboard.
         </p>
         <a href="${approveUrl}" style="display:inline-block;padding:12px 24px;background:#DFA767;color:#ffffff;text-decoration:none;border-radius:100px;font-size:14px;font-weight:600;">
           Review Request
         </a>`,
      ),
    });
  },

  /**
   * Sent to the visitor when a professional approves their booking request.
   */
  async sendBookingConfirmedVisitor(params: {
    to: string;
    visitorName: string;
    professionalName: string;
    serviceTitle: string;
    slotStart: Date;
    slotEnd: Date;
    timezone: string;
    holdId: string;
    meetingUrl?: string | null;
    appUrl: string;
  }): Promise<void> {
    const slot = formatSlot(params.slotStart, params.slotEnd, params.timezone);
    const statusUrl = `${params.appUrl}/booking/${params.holdId}`;

    const meetingSection = params.meetingUrl
      ? `<p style="margin:16px 0 0;font-size:14px;color:#6B7280;">
           <a href="${params.meetingUrl}" style="color:#DFA767;font-weight:600;">Join meeting link →</a>
         </p>`
      : "";

    const subject = `Booking confirmed — ${params.serviceTitle} with ${params.professionalName}`;
    await sendEmail({
      to: params.to,
      subject,
      html: htmlWrapper(
        subject,
        `<h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#2B2B2B;">Your booking is confirmed! ✓</h1>
         <p style="margin:0 0 16px;font-size:14px;color:#6B7280;">
           Hi ${params.visitorName}, your session with
           <strong style="color:#2B2B2B;">${params.professionalName}</strong>
           for <strong style="color:#2B2B2B;">${params.serviceTitle}</strong> has been confirmed.
         </p>
         ${slotBox(slot)}
         ${meetingSection}
         <p style="margin:20px 0 24px;font-size:13px;color:#9CA3AF;">
           A calendar invite has been sent. You can view your booking details below.
         </p>
         <a href="${statusUrl}" style="display:inline-block;padding:12px 24px;background:#2B2B2B;color:#ffffff;text-decoration:none;border-radius:100px;font-size:14px;font-weight:600;">
           View Booking Details
         </a>`,
      ),
    });
  },

  /**
   * Sent to the professional when a booking is confirmed (auto or manual).
   */
  async sendBookingConfirmedProfessional(params: {
    to: string;
    professionalName: string;
    visitorName: string;
    visitorEmail: string;
    serviceTitle: string;
    slotStart: Date;
    slotEnd: Date;
    timezone: string;
    appUrl: string;
  }): Promise<void> {
    const slot = formatSlot(params.slotStart, params.slotEnd, params.timezone);
    const dashboardUrl = `${params.appUrl}/app/bookings`;

    const subject = `Booking confirmed — ${params.visitorName} for ${params.serviceTitle}`;
    await sendEmail({
      to: params.to,
      subject,
      html: htmlWrapper(
        subject,
        `<h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#2B2B2B;">Booking confirmed ✓</h1>
         <p style="margin:0 0 16px;font-size:14px;color:#6B7280;">
           <strong style="color:#2B2B2B;">${params.visitorName}</strong>
           (<a href="mailto:${params.visitorEmail}" style="color:#DFA767;">${params.visitorEmail}</a>)
           is confirmed for <strong style="color:#2B2B2B;">${params.serviceTitle}</strong>.
           A calendar event has been added to your calendar.
         </p>
         ${slotBox(slot)}
         <a href="${dashboardUrl}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#2B2B2B;color:#ffffff;text-decoration:none;border-radius:100px;font-size:14px;font-weight:600;">
           View in Dashboard
         </a>`,
      ),
    });
  },

  /**
   * Sent to the visitor when a professional declines their booking request.
   */
  async sendBookingDeclinedVisitor(params: {
    to: string;
    visitorName: string;
    professionalName: string;
    serviceTitle: string;
    slotStart: Date;
    slotEnd: Date;
    timezone: string;
  }): Promise<void> {
    const slot = formatSlot(params.slotStart, params.slotEnd, params.timezone);

    const subject = `Booking request declined — ${params.serviceTitle}`;
    await sendEmail({
      to: params.to,
      subject,
      html: htmlWrapper(
        subject,
        `<h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#2B2B2B;">Request not accepted</h1>
         <p style="margin:0 0 16px;font-size:14px;color:#6B7280;">
           Hi ${params.visitorName}, unfortunately
           <strong style="color:#2B2B2B;">${params.professionalName}</strong>
           is unable to accept your request for
           <strong style="color:#2B2B2B;">${params.serviceTitle}</strong>
           at this time.
         </p>
         ${slotBox(slot)}
         <p style="margin:16px 0 0;font-size:13px;color:#9CA3AF;">
           You're welcome to submit a new request with a different time or service.
         </p>`,
      ),
    });
  },
};
