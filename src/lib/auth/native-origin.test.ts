import assert from "node:assert/strict";
import test from "node:test";
import { getBaseURL } from "../../../node_modules/better-auth/dist/utils/url.mjs";
import { authClientBaseURL } from "./native-origin.ts";

const CAPACITOR_ORIGIN = "capacitor://localhost";

test("website origins keep Better Auth on their own address", () => {
  assert.equal(authClientBaseURL("https://path-connect-iota.vercel.app"), undefined);
  assert.equal(authClientBaseURL("http://localhost:8080"), undefined);
  assert.equal(authClientBaseURL("https://localhost"), undefined);
  assert.equal(authClientBaseURL(undefined), undefined);
});

test("Capacitor iOS gets an http base Better Auth will accept", () => {
  assert.throws(
    () => getBaseURL(CAPACITOR_ORIGIN, "/api/auth", undefined, false),
    /capacitor:\/\/localhost/,
  );
  const baseURL = authClientBaseURL(CAPACITOR_ORIGIN);
  assert.equal(baseURL, "http://localhost");
  assert.equal(getBaseURL(baseURL, "/api/auth", undefined, false), "http://localhost/api/auth");
});
