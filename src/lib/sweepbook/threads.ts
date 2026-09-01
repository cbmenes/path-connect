import type { MessageChannel } from "./types";

export type ThreadRef = {
  channel: MessageChannel;
  clientId: string | null;
  teamUserId: string | null;
};

export function encodeThreadId(ref: ThreadRef): string {
  if (ref.channel === "team_client") {
    return `tc--${ref.teamUserId}--${ref.clientId}`;
  }
  if (ref.channel === "master_team") {
    return `mt--${ref.teamUserId}`;
  }
  return `mc--${ref.clientId}`;
}

export function parseThreadId(raw: string): ThreadRef {
  if (raw.startsWith("tc--")) {
    const rest = raw.slice(4);
    const sep = rest.indexOf("--");
    if (sep <= 0) throw new Error("Thread not found.");
    return {
      channel: "team_client",
      teamUserId: rest.slice(0, sep),
      clientId: rest.slice(sep + 2),
    };
  }
  if (raw.startsWith("mt--")) {
    return { channel: "master_team", teamUserId: raw.slice(4), clientId: null };
  }
  if (raw.startsWith("mc--")) {
    return { channel: "master_client", clientId: raw.slice(4), teamUserId: null };
  }
  return { channel: "master_client", clientId: raw, teamUserId: null };
}

export function masterClientThread(clientId: string) {
  return encodeThreadId({ channel: "master_client", clientId, teamUserId: null });
}
