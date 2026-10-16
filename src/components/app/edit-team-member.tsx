import { useState } from "react";
import { toast } from "sonner";
import { resendTeamInvite, updateTeamMember } from "@/lib/sweepbook/team";
import type { PayType } from "@/lib/sweepbook/pay-rate";
import type { AvailabilityWindow, TeamMember } from "@/lib/sweepbook/types";
import { addressPartsFrom, namesFrom, type AddressParts } from "@/lib/sweepbook/people";
import { TeamDetailSections } from "@/components/app/team-details";
import { Button } from "@/components/ui/button";
import { DialogContent } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";

export function EditMember({
  member,
  canEditPay,
  canEditCharge,
  onClose,
  onSaved,
}: {
  member: TeamMember;
  canEditPay: boolean;
  canEditCharge: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isAdminMember = member.office_role === "admin";
  const names = namesFrom(member.first_name, member.last_name, member.full_name);
  const [firstName, setFirstName] = useState(names.first_name);
  const [lastName, setLastName] = useState(names.last_name);
  const [phone, setPhone] = useState(member.phone ?? "");
  const [smsOptIn, setSmsOptIn] = useState(member.sms_opt_in === true);
  const [email, setEmail] = useState(member.email ?? "");
  const [active, setActive] = useState(member.team_status !== "disabled");
  const [messaging, setMessaging] = useState(member.can_message);
  const [charge, setCharge] = useState(Boolean(member.can_charge));
  const [clock, setClock] = useState(member.can_clock_in !== false);
  const [payType, setPayType] = useState<PayType>(member.pay_type ?? "none");
  const [payDollars, setPayDollars] = useState(((member.pay_amount ?? 0) / 100).toFixed(2));
  const [payPercent, setPayPercent] = useState(String(member.pay_type === "percent" ? member.pay_amount ?? 0 : 0));
  const [payNote, setPayNote] = useState(member.pay_note ?? "");
  const [notes, setNotes] = useState(member.staff_notes ?? "");
  const [availability, setAvailability] = useState<AvailabilityWindow[]>(member.availability ?? []);
  const [address, setAddress] = useState<AddressParts>(addressPartsFrom(member));
  const [emergencyName, setEmergencyName] = useState(member.emergency_name ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(member.emergency_phone ?? "");
  const [birthday, setBirthday] = useState(member.birthday ?? "");
  const [startDate, setStartDate] = useState(member.start_date ?? "");
  const [busy, setBusy] = useState(false);
  const inviteLabel = member.pending && !member.invite_sent ? "Send invite" : "Resend invite";

  return (
    <DialogContent title={`Edit ${member.full_name}`} className="max-h-[90dvh] overflow-y-auto">
      <form
        className="grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await updateTeamMember({
              data: {
                userId: member.user_id,
                firstName,
                lastName,
                phone,
                email,
                smsOptIn,
                canMessage: isAdminMember ? undefined : messaging,
                canClockIn: isAdminMember ? undefined : clock,
                status: member.pending ? undefined : active ? "active" : "disabled",
                canCharge: canEditCharge ? charge : undefined,
                ...(canEditPay && !isAdminMember
                  ? {
                      payType,
                      payAmount:
                        payType === "none"
                          ? 0
                          : payType === "percent"
                            ? Math.round(Number(payPercent) || 0)
                            : Math.round(Number(payDollars) * 100),
                      payNote,
                    }
                  : {}),
                details: {
                  staffNotes: notes,
                  addressLine1: address.address_line1,
                  addressLine2: address.address_line2,
                  city: address.city,
                  state: address.state,
                  zip: address.zip,
                  emergencyName,
                  emergencyPhone,
                  birthday,
                  startDate,
                  availability: isAdminMember ? [] : availability,
                },
              },
            });
            toast.success(isAdminMember ? "Admin updated." : "Team cleaner updated.");
            await onSaved();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <TeamDetailSections
          showAvailability={!isAdminMember}
          showIdentity
          firstName={firstName}
          onFirstName={setFirstName}
          lastName={lastName}
          onLastName={setLastName}
          phone={phone}
          onPhone={setPhone}
          smsOptIn={smsOptIn}
          onSmsOptIn={setSmsOptIn}
          email={email}
          onEmail={setEmail}
          notes={notes}
          onNotes={setNotes}
          availability={availability}
          onAvailability={setAvailability}
          address={address}
          onAddress={setAddress}
          emergencyName={emergencyName}
          onEmergencyName={setEmergencyName}
          emergencyPhone={emergencyPhone}
          onEmergencyPhone={setEmergencyPhone}
          birthday={birthday}
          onBirthday={setBirthday}
          startDate={startDate}
          onStartDate={setStartDate}
        />
        {member.pending ? null : (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        )}
        {canEditCharge ? (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={charge} onChange={(e) => setCharge(e.target.checked)} />
            Can charge clients
          </label>
        ) : null}
        {isAdminMember ? null : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setMessaging((v) => !v)}>
              Messaging: {messaging ? "On" : "Off"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setClock((v) => !v)}>
              Clock in/out: {clock ? "On" : "Off"}
            </Button>
          </div>
        )}
        {!canEditPay || isAdminMember ? null : (
          <div className="grid gap-3 rounded-xl bg-secondary p-3">
            <p className="text-sm font-medium">Pay rate</p>
            <p className="text-xs text-muted">Used on Team pay. This cleaner never sees the rate.</p>
            <Field label="Pay type">
              <NativeSelect value={payType} onChange={(e) => setPayType(e.target.value as PayType)}>
                <option value="none">None</option>
                <option value="hourly">Hourly</option>
                <option value="per_job">Per job</option>
                <option value="percent">Percent of job price</option>
              </NativeSelect>
            </Field>
            {payType === "hourly" || payType === "per_job" ? (
              <Field label={payType === "hourly" ? "Hourly rate" : "Per-job rate"}>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={payDollars}
                  onChange={(e) => setPayDollars(e.target.value)}
                />
              </Field>
            ) : null}
            {payType === "percent" ? (
              <Field label="Percent of job price">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={payPercent}
                  onChange={(e) => setPayPercent(e.target.value)}
                />
              </Field>
            ) : null}
            <Field label="Note (optional)">
              <Textarea value={payNote} onChange={(e) => setPayNote(e.target.value)} />
            </Field>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            const res = await resendTeamInvite({ data: { userId: member.user_id, inviteToken: member.invite_token } });
            const url = `${window.location.origin}${res.path}`;
            await navigator.clipboard?.writeText(url).catch(() => undefined);
            toast.success(member.pending && !member.invite_sent ? "Invite sent. Link copied." : "Invite link copied.");
          }}
        >
          {inviteLabel}
        </Button>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
