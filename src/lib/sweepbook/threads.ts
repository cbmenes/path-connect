import type { MessageChannel } from "./types";

export type ThreadRef = {
  channel: MessageChannel;
  clientId: string | null;
  teamUserId: string | null;
  adminUserId: string | null;
};

function ref(partial: {
  channel: MessageChannel;
  clientId?: string | null;
  teamUserId?: string | null;
  adminUserId?: string | null;
}): ThreadRef {
  return {
    channel: partial.channel,
    clientId: partial.clientId ?? null,
    teamUserId: partial.teamUserId ?? null,
    adminUserId: partial.adminUserId ?? null,
  };
}

export function encodeThreadId(input: {
  channel: MessageChannel;
  clientId?: string | null;
  teamUserId?: string | null;
  adminUserId?: string | null;
}): string {
  const t = ref(input);
  if (t.channel === "team_client") {
    return `tc--${t.teamUserId}--${t.clientId}`;
  }
  if (t.channel === "master_team") {
    return `mt--${t.teamUserId}`;
  }
  if (t.channel === "admin_client") {
    return `ac--${t.adminUserId}--${t.clientId}`;
  }
  if (t.channel === "master_admin") {
    return `ma--${t.adminUserId}`;
  }
  if (t.channel === "admin_team") {
    return `at--${t.adminUserId}--${t.teamUserId}`;
  }
  return `mc--${t.clientId}`;
}

function splitPair(raw: string, prefix: string) {
  const rest = raw.slice(prefix.length);
  const sep = rest.indexOf("--");
  if (sep <= 0) throw new Error("Thread not found.");
  return { left: rest.slice(0, sep), right: rest.slice(sep + 2) };
}

export function parseThreadId(raw: string): ThreadRef {
  if (raw.startsWith("tc--")) {
    const { left, right } = splitPair(raw, "tc--");
    return ref({ channel: "team_client", teamUserId: left, clientId: right });
  }
  if (raw.startsWith("mt--")) {
    return ref({ channel: "master_team", teamUserId: raw.slice(4) });
  }
  if (raw.startsWith("ac--")) {
    const { left, right } = splitPair(raw, "ac--");
    return ref({ channel: "admin_client", adminUserId: left, clientId: right });
  }
  if (raw.startsWith("ma--")) {
    return ref({ channel: "master_admin", adminUserId: raw.slice(4) });
  }
  if (raw.startsWith("at--")) {
    const { left, right } = splitPair(raw, "at--");
    return ref({ channel: "admin_team", adminUserId: left, teamUserId: right });
  }
  if (raw.startsWith("mc--")) {
    return ref({ channel: "master_client", clientId: raw.slice(4) });
  }
  return ref({ channel: "master_client", clientId: raw });
}

/** How a thread is stored on `messages` (admin channels reuse team_user_id for the admin). */
export function threadStorage(ref: ThreadRef) {
  if (ref.channel === "admin_client") {
    const adminId = ref.adminUserId;
    return { clientId: ref.clientId, teamUserId: adminId, adminUserId: adminId };
  }
  if (ref.channel === "master_admin") {
    const adminId = ref.adminUserId;
    return { clientId: null as string | null, teamUserId: adminId, adminUserId: adminId };
  }
  if (ref.channel === "admin_team") {
    return { clientId: null as string | null, teamUserId: ref.teamUserId, adminUserId: ref.adminUserId };
  }
  return { clientId: ref.clientId, teamUserId: ref.teamUserId, adminUserId: null as string | null };
}

export function masterClientThread(clientId: string) {
  return encodeThreadId({ channel: "master_client", clientId });
}

export function teamClientThread(teamUserId: string, clientId: string) {
  return encodeThreadId({ channel: "team_client", teamUserId, clientId });
}

export function adminClientThread(adminUserId: string, clientId: string) {
  return encodeThreadId({ channel: "admin_client", adminUserId, clientId });
}

export function masterAdminThread(adminUserId: string) {
  return encodeThreadId({ channel: "master_admin", adminUserId });
}

export function adminTeamThread(adminUserId: string, teamUserId: string) {
  return encodeThreadId({ channel: "admin_team", adminUserId, teamUserId });
}

export function appointmentMessageThread(opts: {
  role: "cleaner" | "team" | "admin" | string;
  teamUserId?: string | null;
  adminUserId?: string | null;
  clientId: string;
}) {
  if (opts.role === "team" && opts.teamUserId) {
    return teamClientThread(opts.teamUserId, opts.clientId);
  }
  if (opts.role === "admin" && (opts.adminUserId || opts.teamUserId)) {
    return adminClientThread(opts.adminUserId || opts.teamUserId || "", opts.clientId);
  }
  return masterClientThread(opts.clientId);
}
