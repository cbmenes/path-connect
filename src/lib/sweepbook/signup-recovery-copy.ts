import { APP_HOST, APP_NAME } from "../brand.ts";

export const SIGNUP_RECOVERY_SUBJECT = "Finish setting up your CrewWeek account";

const LOGIN_URL = `${APP_HOST}/login`;
const LOGO_URL = `${APP_HOST}/icon-192.png`;

/** One email, and only while the customer still has neither a subscription nor a payment. */
export function signupRecoveryShouldSend(input: {
  alreadySent: boolean;
  activeSubscription: boolean;
  successfulPayment: boolean;
}) {
  if (input.alreadySent) return false;
  if (input.activeSubscription || input.successfulPayment) return false;
  return true;
}

export function signupRecoveryEmail() {
  const text = [
    "You’re almost set up.",
    "",
    "Log back in anytime to complete your subscription and start managing your routes, team, and client payments.",
    "",
    `Log in to ${APP_NAME}: ${LOGIN_URL}`,
  ].join("\n");
  const html = `
    <div style="font-family:Georgia,serif;line-height:1.5;color:#1B365D">
      <p style="margin:0 0 20px">
        <img src="${LOGO_URL}" alt="${APP_NAME}" width="40" height="40"
             style="display:inline-block;vertical-align:middle;border:0;border-radius:12px" />
        <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-family:Helvetica,Arial,sans-serif;font-size:18px;font-weight:600;color:#1B365D">${APP_NAME}</span>
      </p>
      <p style="margin:0 0 12px">You’re almost set up.</p>
      <p style="margin:0 0 16px">Log back in anytime to complete your subscription and start managing your routes, team, and client payments.</p>
      <p style="margin:0">
        <a href="${LOGIN_URL}"
           style="display:inline-block;background:#1B365D;color:#F7F4EE;text-decoration:none;padding:12px 18px;border-radius:8px">
          Log in to ${APP_NAME}
        </a>
      </p>
    </div>
  `.trim();
  return { subject: SIGNUP_RECOVERY_SUBJECT, text, html };
}
