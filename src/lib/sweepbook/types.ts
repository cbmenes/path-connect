export type Role = "cleaner" | "client";

export type CleanerKind = "master" | "team";

export type TeamStatus = "pending" | "active" | "disabled";

export type PayType = "none" | "hourly" | "per_job" | "percent";

export type Frequency = "none" | "weekly" | "biweekly" | "monthly" | "one-off";

export type JobStatus = "scheduled" | "completed" | "cancelled" | "reschedule_requested";

export type Recurrence = "none" | "weekly" | "biweekly" | "monthly";

export type InvoiceStatus = "unpaid" | "paid" | "failed" | "void";

export type PlanStatus = "trial" | "active" | "past_due";

export type NotificationKind =
  | "cancel"
  | "reschedule"
  | "request_approved"
  | "request_declined"
  | "job_assigned"
  | "tip";

export type NotificationStatus = "unread" | "read" | "approved" | "declined";

export type Profile = {
  user_id: string;
  role: Role;
  full_name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  cancellation_policy: string | null;
  default_duration_min: number;
  default_rate_cents: number;
  cleaner_kind: CleanerKind | null;
  master_user_id: string | null;
  can_message: boolean;
  team_status: TeamStatus | null;
  team_messaging_enabled: boolean;
  email_reminders: boolean;
  reminder_email_team: boolean;
  plan_status: PlanStatus;
  plan_price_cents: number;
  created_at: string;
};

export type AssigneeRef = {
  user_id: string;
  full_name: string;
};

export type ClientRow = {
  id: string;
  cleaner_user_id: string;
  linked_user_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  access_notes: string | null;
  pets: string | null;
  supplies: string | null;
  default_price_cents: number | null;
  default_duration_min: number | null;
  usual_day: string | null;
  usual_time: string | null;
  frequency: string | null;
  notes: string | null;
  created_at: string;
  assigned_user_ids?: string[];
  assignees?: AssigneeRef[];
};

export type JobRow = {
  id: string;
  cleaner_user_id: string;
  client_id: string;
  service: string;
  address: string | null;
  start_at: string;
  duration_min: number;
  price_cents: number;
  notes: string | null;
  status: JobStatus;
  recurrence: Recurrence;
  series_id: string | null;
  cancel_reason: string | null;
  reschedule_note: string | null;
  reschedule_requested_at: string | null;
  assigned_to_user_id: string | null;
  tip_cents: number;
  tip_requested: boolean;
  created_at: string;
};

export type JobWithClient = JobRow & {
  client_name: string;
  client_phone: string | null;
  assignee_name: string | null;
  assignees: AssigneeRef[];
  payment_status: InvoiceStatus | null;
};

export type MessageChannel = "master_client" | "team_client" | "master_team";

export type MessageRow = {
  id: string;
  cleaner_user_id: string;
  client_id: string | null;
  sender_role: Role;
  body: string;
  created_at: string;
  read_at: string | null;
  channel: MessageChannel;
  team_user_id: string | null;
  sender_user_id: string | null;
  sender_name: string | null;
};

export type InvoiceRow = {
  id: string;
  cleaner_user_id: string;
  client_id: string;
  job_id: string | null;
  amount_cents: number;
  description: string;
  status: InvoiceStatus;
  method: string | null;
  kind: "visit" | "tip" | "other";
  paid_at: string | null;
  failure_reason: string | null;
  receipt_number: string | null;
  created_at: string;
};

export type InvoiceWithClient = InvoiceRow & {
  client_name: string;
  job_start_at?: string | null;
};

export type CardRow = {
  id: string;
  cleaner_user_id: string;
  client_id: string;
  brand: string;
  last4: string;
  exp_month: number | null;
  exp_year: number | null;
  holder_name: string | null;
  source: "client" | "cleaner";
  is_default: boolean;
  failing: boolean;
  created_at: string;
};

export type ThreadSummary = {
  thread_id: string;
  title: string;
  subtitle: string | null;
  last_body: string;
  last_at: string;
  unread: number;
};

export type MessageRecipient = {
  id: string;
  name: string;
  subtitle: string | null;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  job_id: string | null;
  client_id: string | null;
  client_name: string | null;
  requested_start_at: string | null;
  status: NotificationStatus;
  created_at: string;
  handled_at: string | null;
};

export type TeamMember = {
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  can_message: boolean;
  team_status: TeamStatus;
  pending: boolean;
  invite_sent?: boolean;
  invite_token?: string;
  assigned_clients: { id: string; name: string }[];
  pay_type?: PayType;
  pay_amount?: number;
  pay_note?: string | null;
};

export type BillingMethod = {
  id: string;
  user_id: string;
  kind: "card" | "ach";
  brand: string | null;
  last4: string;
  exp_month: number | null;
  exp_year: number | null;
  holder_name: string | null;
  bank_name: string | null;
  is_default: boolean;
  created_at: string;
};

export type RevenueSummary = {
  monthCents: number;
  ytdCents: number;
  annualCents: number;
  monthLabel: string;
  year: number;
};

export type Actor =
  | { kind: "cleaner"; userId: string; profile: Profile; masterUserId: string }
  | {
      kind: "team";
      userId: string;
      profile: Profile;
      masterUserId: string;
      canMessage: boolean;
      disabled: boolean;
    }
  | { kind: "client"; userId: string; profile: Profile; client: ClientRow; cleanerName: string }
  | { kind: "client_unlinked"; userId: string; profile: Profile }
  | { kind: "none"; userId: string };

export const DEMO_CLEANER_EMAIL = "demo@sweepbook.app";
export const DEMO_CLEANER_PASSWORD = "demo123";
export const DEMO_CLIENT_EMAIL = "client@sweepbook.app";
export const DEMO_CLIENT_PASSWORD = "client123";
export const DEMO_TEAM_EMAIL = "team@sweepbook.app";
export const DEMO_TEAM_PASSWORD = "team123";
export const DEMO_TEAM2_EMAIL = "team2@sweepbook.app";
export const DEMO_TEAM2_PASSWORD = "team123";
export const DEMO_CLEANER_ID = "demo-cleaner-maya";
export const DEMO_CLIENT_USER_ID = "demo-client-cam";
export const DEMO_TEAM_ID = "demo-team-lena";
export const DEMO_TEAM2_ID = "demo-team-noah";
export const CAM_CLIENT_ID = "client-cam-delgado";
