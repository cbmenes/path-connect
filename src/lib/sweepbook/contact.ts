import { createServerFn } from "@tanstack/react-start";
import { SUPPORT_EMAIL } from "@/lib/brand";
import { sendMail } from "./mail";

const SEND_FAILED = "We couldn't send your message. Email support@getcrewweek.com instead.";

function cleanLine(value: string, max: number) {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export const submitContact = createServerFn({ method: "POST" })
  .validator((input: { name?: string; email?: string; message?: string }) => {
    const name = cleanLine(String(input?.name ?? ""), 120);
    const email = cleanLine(String(input?.email ?? ""), 200);
    const message = String(input?.message ?? "").trim().slice(0, 5000);
    if (!name) throw new Error("Enter your name.");
    if (!email.includes("@") || email.includes(" ") || !email.includes(".")) {
      throw new Error("Enter a valid email.");
    }
    if (!message) throw new Error("Enter a message.");
    return { name, email, message };
  })
  .handler(async ({ data }) => {
    const text = [`Name: ${data.name}`, `Email: ${data.email}`, "", data.message].join("\n");
    try {
      await sendMail({
        to: SUPPORT_EMAIL,
        replyTo: data.email,
        subject: `CrewWeek contact from ${data.name}`,
        text,
      });
    } catch (err) {
      console.error("[contact]", err instanceof Error ? err.message : "send failed");
      throw new Error(SEND_FAILED);
    }
    return { ok: true as const };
  });
