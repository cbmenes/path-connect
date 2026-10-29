import assert from "node:assert/strict";
import test from "node:test";
import { signupRecoveryEmail, signupRecoveryShouldSend, SIGNUP_RECOVERY_SUBJECT } from "./signup-recovery-copy.ts";

test("sends only when the customer has not subscribed, paid, or already been emailed", () => {
  assert.equal(
    signupRecoveryShouldSend({ alreadySent: false, activeSubscription: false, successfulPayment: false }),
    true,
  );
  assert.equal(
    signupRecoveryShouldSend({ alreadySent: false, activeSubscription: true, successfulPayment: false }),
    false,
  );
  assert.equal(
    signupRecoveryShouldSend({ alreadySent: false, activeSubscription: false, successfulPayment: true }),
    false,
  );
  assert.equal(
    signupRecoveryShouldSend({ alreadySent: true, activeSubscription: false, successfulPayment: false }),
    false,
  );
});

test("recovery email uses the navy logo, the login link, and the requested copy", () => {
  const copy = signupRecoveryEmail();
  assert.equal(copy.subject, SIGNUP_RECOVERY_SUBJECT);
  assert.match(copy.html, /https:\/\/crewweek\.app\/icon-192\.png/);
  assert.match(copy.html, /#1B365D/);
  assert.match(copy.html, /You’re almost set up\./);
  assert.match(
    copy.text,
    /Log back in anytime to complete your subscription and start managing your routes, team, and client payments\./,
  );
  assert.match(copy.html, /href="https:\/\/crewweek\.app\/login"/);
  assert.match(copy.html, /Log in to CrewWeek/);
});
