import { subscriptionAccessLocked } from "./plan-prices";

export type Role = "cleaner" | "client";

export type CleanerKind = "master" | "team" | "admin";

export type OfficeRole = "team" | "admin";

export type TeamStatus = "pending" | "active" | "disabled";

export type PayType = "none" | "hourly" | "per_job" | "percent";

export type Frequency = "none" | "weekly" | "biweekly" | "monthly" | "one-off";

export type JobStatus = "scheduled" | "completed" | "cancelled" | "reschedule_requested";

export type ProgressStatus = "on_the_way" | "in_progress" | "finished";

export type Recurrence = "none" | "weekly" | "biweekly" | "monthly";

export type RecurringPlan = {
  seriesId: string;
  clientId: string;
  clientName: string;
  recurrence: Recurrence;
  weekday: string;
  time: string;
  durationMin: number;
  priceCents: number;
  service: string;
  assignedToUserIds: string[];
  assignedNames: string[];
  nextStartAt: string | null;
  futureCount: number;
};

export type InvoiceStatus = "unpaid" | "paid" | "failed" | "void";

export type PlanStatus = "trial" | "pending" | "active" | "past_due" | "canceled";

export type NotificationKind =
  | "cancel"
  | "reschedule"
  | "request_approved"
  | "request_declined"
  | "job_assigned"
  | "tip"
  | "clean_request"
  | "time_off";

export type CleanServiceType = "one-time" | "weekly" | "biweekly" | "monthly";

export type CleanRequestStatus = "pending" | "accepted" | "declined";

export type CleanRequest = {
  id: string;
  cleaner_user_id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  service_type: CleanServiceType;
  preferred_date: string | null;
  preferred_time: string | null;
  notes: string | null;
  status: CleanRequestStatus;
  decline_note: string | null;
  job_id: string | null;
  client_id: string | null;
  created_at: string;
  handled_at: string | null;
};

export type NotificationStatus = "unread" | "read" | "approved" | "declined";

export type Profile = {
  user_id: string;
  role: Role;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  booking_slug: string | null;
  cancellation_policy: string | null;
  default_duration_min: number;
  default_rate_cents: number;
  cleaner_kind: CleanerKind | null;
  master_user_id: string | null;
  can_message: boolean;
  team_status: TeamStatus | null;
  team_messaging_enabled: boolean;
  team_checklists_enabled: boolean;
  team_clock_in_enabled: boolean;
  can_see_checklists: boolean;
  can_clock_in: boolean;
  email_reminders: boolean;
  reminder_email_team: boolean;
  can_charge: boolean;
  plan_status: PlanStatus;
  plan_price_cents: number;
  plan_code: "crew" | "office" | null;
  billing_interval: "month" | "year" | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_account_id: string | null;
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
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  access_notes: string | null;
  pets: string | null;
  supplies: string | null;
  default_price_cents: number | null;
  default_duration_min: number | null;
  usual_day: string | null;
  usual_time: string | null;
  frequency: string | null;
  notes: string | null;
  checklist_template_id: string | null;
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
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
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
  checklist_template_id: string | null;
  progress_status: ProgressStatus | null;
  on_the_way_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type JobWithClient = JobRow & {
  client_name: string;
  client_phone: string | null;
  client_notes: string | null;
  assignee_name: string | null;
  assignees: AssigneeRef[];
  payment_status: InvoiceStatus | null;
  payment_paid_at?: string | null;
  payment_method?: string | null;
  payment_note?: string | null;
};

export type MessageChannel =
  | "master_client"
  | "team_client"
  | "master_team"
  | "admin_client"
  | "master_admin"
  | "admin_team";

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
  paid_note: string | null;
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
  request_id: string | null;
  requested_start_at: string | null;
  status: NotificationStatus;
  created_at: string;
  handled_at: string | null;
};

export type AvailabilityWindow = {
  day: number;
  start: string;
  end: string;
};

export type TeamMember = {
  user_id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  phone: string | null;
  email: string | null;
  can_message: boolean;
  can_see_checklists?: boolean;
  can_clock_in?: boolean;
  team_status: TeamStatus;
  pending: boolean;
  invite_sent?: boolean;
  invite_token?: string;
  assigned_clients: { id: string; name: string }[];
  pay_type?: PayType;
  pay_amount?: number;
  pay_note?: string | null;
  office_role?: OfficeRole;
  can_charge?: boolean;
  staff_notes?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  emergency_name?: string | null;
  emergency_phone?: string | null;
  birthday?: string | null;
  start_date?: string | null;
  availability?: AvailabilityWindow[];
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
      kind: "admin";
      userId: string;
      profile: Profile;
      masterUserId: string;
      masterPlanStatus: PlanStatus;
      masterCancelAtPeriodEnd: boolean;
      masterPeriodEnd: string | null;
      canCharge: boolean;
      canMessage: boolean;
      disabled: boolean;
    }
  | {
      kind: "team";
      userId: string;
      profile: Profile;
      masterUserId: string;
      canMessage: boolean;
      canSeeChecklists: boolean;
      canClockIn: boolean;
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
export const DEMO_ADMIN_EMAIL = "admin@sweepbook.app";
export const DEMO_ADMIN_PASSWORD = "admin123";
export const DEMO_CLEANER_ID = "demo-cleaner-maya";
export const DEMO_CLIENT_USER_ID = "demo-client-cam";
export const DEMO_TEAM_ID = "demo-team-lena";
export const DEMO_TEAM2_ID = "demo-team-noah";
export const DEMO_ADMIN_ID = "demo-admin-renee";
export const CAM_CLIENT_ID = "client-cam-delgado";
export const DEMO_REQUEST_ID = "demo-request-riley";
export const DEMO_TIME_OFF_APPROVED_ID = "toff-lena-approved";
export const DEMO_TIME_OFF_PENDING_ID = "toff-lena-pending";

const DEMO_ACCOUNT_EMAILS = new Set(
  [DEMO_CLEANER_EMAIL, DEMO_CLIENT_EMAIL, DEMO_TEAM_EMAIL, DEMO_TEAM2_EMAIL, DEMO_ADMIN_EMAIL].map((email) =>
    email.toLowerCase(),
  ),
);

export function isDemoAccountEmail(email: string | null | undefined) {
  return DEMO_ACCOUNT_EMAILS.has((email || "").trim().toLowerCase());
}

export function actorWritesLocked(actor?: Actor | null) {
  if (!actor) return false;
  if (actor.kind === "cleaner") {
    if (isDemoAccountEmail(actor.profile.email)) return false;
    return subscriptionAccessLocked({
      status: actor.profile.plan_status,
      cancelAtPeriodEnd: actor.profile.cancel_at_period_end,
      periodEnd: actor.profile.current_period_end,
    });
  }
  if (actor.kind === "admin") {
    if (isDemoAccountEmail(actor.profile.email)) return false;
    return subscriptionAccessLocked({
      status: actor.masterPlanStatus,
      cancelAtPeriodEnd: actor.masterCancelAtPeriodEnd,
      periodEnd: actor.masterPeriodEnd,
    });
  }
  return false;
}

export function isOfficeActor(actor?: Actor | null) {
  return actor?.kind === "cleaner" || actor?.kind === "admin";
}

export function actorCanCharge(actor?: Actor | null) {
  if (!actor) return false;
  if (actor.kind === "cleaner") return true;
  if (actor.kind === "admin") return actor.canCharge && !actor.disabled;
  return false;
}
