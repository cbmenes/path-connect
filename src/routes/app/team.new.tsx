import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getMyActor } from "@/lib/sweepbook/bootstrap";
import { createTeamInvite, listTeam, saveTeamMember } from "@/lib/sweepbook/team";
import { actorWritesLocked, isOfficeActor, type OfficeRole } from "@/lib/sweepbook/types";
import { emptyAddress, type AddressParts } from "@/lib/sweepbook/people";
import type { AvailabilityWindow } from "@/lib/sweepbook/types";
import { TeamDetailSections } from "@/components/app/team-details";
import { PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, NativeSelect } from "@/components/ui/input";

export const Route = createFileRoute("/app/team/new")({ component: AddTeamMemberPage });

function AddTeamMemberPage() {
  const navigate = useNavigate();
  const actor = useQuery({ queryKey: ["actor"], queryFn: () => getMyActor() });
  const q = useQuery({ queryKey: ["team"], queryFn: () => listTeam(), enabled: isOfficeActor(actor.data) });
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [canMessage, setCanMessage] = useState(true);
  const [inviteKind, setInviteKind] = useState<OfficeRole>("team");
  const [canCharge, setCanCharge] = useState(false);
  const [notes, setNotes] = useState("");
  const [availability, setAvailability] = useState<AvailabilityWindow[]>([]);
  const [address, setAddress] = useState<AddressParts>(emptyAddress());
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [startDate, setStartDate] = useState("");
  const [busy, setBusy] = useState(false);
  const writesLocked = actorWritesLocked(actor.data);
  const canManageAdmins = Boolean(q.data?.canManageAdmins);
  const personDetails = {
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
    availability: inviteKind === "admin" ? [] : availability,
  };

  if (actor.data && !isOfficeActor(actor.data)) {
    return <p className="text-muted">Only the office manages the team.</p>;
  }

  async function refreshTeam() {
    await qc.invalidateQueries({ queryKey: ["team"] });
    await qc.invalidateQueries({ queryKey: ["crew-marks"] });
    await qc.invalidateQueries({ queryKey: ["assignable-staff"] });
    await qc.invalidateQueries({ queryKey: ["staff"] });
    await qc.invalidateQueries({ queryKey: ["time-off-people"] });
  }

  function requireName() {
    if (firstName.trim() && lastName.trim()) return true;
    toast.error("First and last name are required.");
    return false;
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <PageHeader
        title="Add Team Member"
        action={
          <Button variant="outline" asChild>
            <Link to="/app/team">Back to Team</Link>
          </Button>
        }
      />
      <Card>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!requireName()) return;
            setBusy(true);
            try {
              const res = await createTeamInvite({
                data: { firstName, lastName, phone, email, canMessage, inviteKind, canCharge, details: personDetails },
              });
              const url = `${window.location.origin}${res.path}`;
              await navigator.clipboard?.writeText(url).catch(() => undefined);
              toast.success("Invite link copied.");
              await refreshTeam();
              await navigate({ to: "/app/team" });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not create invite.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {canManageAdmins ? (
            <Field label="Role">
              <NativeSelect
                value={inviteKind}
                onChange={(e) => setInviteKind(e.target.value === "admin" ? "admin" : "team")}
              >
                <option value="team">Team cleaner</option>
                <option value="admin">Admin</option>
              </NativeSelect>
            </Field>
          ) : null}
          <TeamDetailSections
            showIdentity
            showAvailability={inviteKind === "team"}
            firstName={firstName}
            onFirstName={setFirstName}
            lastName={lastName}
            onLastName={setLastName}
            phone={phone}
            onPhone={setPhone}
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
          {inviteKind === "team" ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={canMessage} onChange={(e) => setCanMessage(e.target.checked)} />
              Can message clients
            </label>
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={canCharge} onChange={(e) => setCanCharge(e.target.checked)} />
              Can charge clients
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy || writesLocked}
              onClick={async () => {
                if (!requireName()) return;
                setBusy(true);
                try {
                  await saveTeamMember({
                    data: { firstName, lastName, phone, email, canMessage, inviteKind, canCharge, details: personDetails },
                  });
                  toast.success("Saved to the team list.");
                  await refreshTeam();
                  await navigate({ to: "/app/team" });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not save.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button type="submit" disabled={busy || writesLocked}>
              {busy ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
