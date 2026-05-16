"use client";

import { useMemo, useState, type DragEvent } from "react";
import { Save, Star, Users } from "lucide-react";
import { getRosterSeatDefinitions, hasCompleteRosterProfile, type SeatDefinition } from "@/lib/roster-config";
import { cn } from "@/lib/utils";
import type { TeamFormRoster, TeamMember } from "@/lib/types";

type RosterFormCode = "B1" | "B2";
type Layout = Record<string, string | null>;

export function RosterLayoutPanel({
  teamId,
  forms,
  members,
  rosters,
  canUpload,
}: {
  teamId: string;
  forms: RosterFormCode[];
  members: TeamMember[];
  rosters: Partial<Record<RosterFormCode, TeamFormRoster | null>>;
  canUpload: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-950">Roster seating charts</h2>
        <p className="mt-1 text-sm text-slate-600">Save the seating chart for each roster.</p>
      </div>

      <div className="divide-y divide-slate-200">
        {forms.map((formCode) => (
          <RosterEditor
            key={formCode}
            teamId={teamId}
            formCode={formCode}
            members={members}
            initialRoster={rosters[formCode]}
            canUpload={canUpload}
          />
        ))}
      </div>
    </section>
  );
}

function RosterEditor({
  teamId,
  formCode,
  members,
  initialRoster,
  canUpload,
}: {
  teamId: string;
  formCode: RosterFormCode;
  members: TeamMember[];
  initialRoster?: TeamFormRoster | null;
  canUpload: boolean;
}) {
  const seats = useMemo(() => getRosterSeatDefinitions(formCode), [formCode]);
  const paddlerSeats = seats.filter((seat) => seat.kind === "paddler");
  const alternateSeats = seats.filter((seat) => seat.kind === "alternate");
  const specialtySeats = seats.filter((seat) => seat.kind === "drummer" || seat.kind === "steersperson");
  const [layout, setLayout] = useState<Layout>(initialRoster?.layout ?? {});
  const [captainSeatKey, setCaptainSeatKey] = useState<string | null>(
    initialRoster?.captain_seat_key ?? paddlerSeats[0]?.key ?? null
  );
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const assignedMemberIds = useMemo(() => new Set(Object.values(layout).filter(Boolean) as string[]), [layout]);
  const unassignedMembers = members.filter((member) => !assignedMemberIds.has(member.id));
  const assignedSeats = seats.filter((seat) => layout[seat.key]);
  const requiredSeatsFilled = seats.filter((seat) => seat.required).every((seat) => Boolean(layout[seat.key]));
  const captainSeatFilled = Boolean(captainSeatKey && layout[captainSeatKey]);
  const assignedProfilesComplete = assignedSeats.every((seat) => {
    const member = memberById.get(layout[seat.key] ?? "");
    return member ? hasCompleteRosterProfile(member) : false;
  });

  function assignMember(seatKey: string, memberId: string) {
    setLayout((current) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(next)) {
        if (value === memberId) next[key] = null;
      }
      next[seatKey] = memberId;
      return next;
    });
  }

  function clearSeat(seatKey: string) {
    setLayout((current) => ({ ...current, [seatKey]: null }));
  }

  function handleSeatDrop(event: DragEvent<HTMLDivElement>, seatKey: string, kind: string) {
    if (!canUpload) return;
    event.preventDefault();
    const payload = parseDragPayload(event.dataTransfer.getData("text/plain"));
    if (!payload) return;

    if (payload.type === "member") {
      assignMember(seatKey, payload.memberId);
    }
    if (payload.type === "captain" && kind === "paddler") {
      setCaptainSeatKey(seatKey);
    }
  }

  async function saveRoster() {
    setIsSaving(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/teams/${teamId}/rosters/${formCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout, captainSeatKey }),
      });
      if (!response.ok) {
        setStatus(await readErrorMessage(response));
        return;
      }
      setStatus("Seating layout saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Roster layout</p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">Form {formCode}</h3>
          <p className="mt-2 text-sm text-slate-600">
            Fill every required seat. Alternates may stay empty. Drag the star to the captain&apos;s paddler seat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canUpload || isSaving}
            onClick={saveRoster}
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <Save size={18} />
            {isSaving ? "Saving..." : "Save layout"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <div className="roster-boat-stage rounded-[2rem] border border-emerald-200 p-4">
            <BoatBackdrop />
            <div className="roster-boat-deck relative z-10 mx-auto max-w-3xl rounded-[999px] border-4 border-emerald-700 bg-white/90 p-4 shadow-inner">
              <SeatDropZone
                seat={specialtySeats.find((seat) => seat.kind === "drummer")}
                member={memberById.get(layout.drummer ?? "")}
                captainSeatKey={captainSeatKey}
                canUpload={canUpload}
                onDrop={handleSeatDrop}
                onClear={clearSeat}
              />

              <div className="mt-4 grid grid-cols-2 gap-3">
                {paddlerSeats.map((seat) => (
                  <SeatDropZone
                    key={seat.key}
                    seat={seat}
                    member={memberById.get(layout[seat.key] ?? "")}
                    captainSeatKey={captainSeatKey}
                    canUpload={canUpload}
                    onDrop={handleSeatDrop}
                    onClear={clearSeat}
                    onMoveCaptain={setCaptainSeatKey}
                  />
                ))}
              </div>

              <div className="mt-4">
                <SeatDropZone
                  seat={specialtySeats.find((seat) => seat.kind === "steersperson")}
                  member={memberById.get(layout.steersperson ?? "")}
                  captainSeatKey={captainSeatKey}
                  canUpload={canUpload}
                  onDrop={handleSeatDrop}
                  onClear={clearSeat}
                />
              </div>
            </div>
          </div>

          {alternateSeats.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Alternates</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {alternateSeats.map((seat) => (
                  <SeatDropZone
                    key={seat.key}
                    seat={seat}
                    member={memberById.get(layout[seat.key] ?? "")}
                    captainSeatKey={captainSeatKey}
                    canUpload={canUpload}
                    onDrop={handleSeatDrop}
                    onClear={clearSeat}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-900">
            <Users size={18} />
            <h4 className="font-bold">Member pool</h4>
          </div>
          <div className="mt-3 space-y-2">
            {unassignedMembers.map((member) => (
              <MemberChip key={member.id} member={member} canUpload={canUpload} />
            ))}
            {unassignedMembers.length === 0 ? <p className="text-sm text-slate-500">Every member is assigned.</p> : null}
          </div>
        </aside>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
        <StatusTile label="Required seats" value={requiredSeatsFilled ? "Ready" : "Incomplete"} ready={requiredSeatsFilled} />
        <StatusTile label="Captain seat" value={captainSeatFilled ? "Ready" : "Needed"} ready={captainSeatFilled} />
        <StatusTile label="Assigned profiles" value={assignedProfilesComplete ? "Ready" : "Needs details"} ready={assignedProfilesComplete} />
      </div>

      {status ? <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{status}</p> : null}
    </article>
  );
}

function SeatDropZone({
  seat,
  member,
  captainSeatKey,
  canUpload,
  onDrop,
  onClear,
  onMoveCaptain,
}: {
  seat?: SeatDefinition;
  member?: TeamMember;
  captainSeatKey: string | null;
  canUpload: boolean;
  onDrop: (event: DragEvent<HTMLDivElement>, seatKey: string, kind: string) => void;
  onClear: (seatKey: string) => void;
  onMoveCaptain?: (seatKey: string) => void;
}) {
  if (!seat) return null;
  const isCaptainSeat = captainSeatKey === seat.key;
  const displayLabel = isCaptainSeat && seat.kind === "paddler" ? "Captain" : seat.label;

  return (
    <div
      data-seat-key={seat.key}
      onDragOver={(event) => {
        if (canUpload) event.preventDefault();
      }}
      onDrop={(event) => onDrop(event, seat.key, seat.kind)}
      className={cn(
        "relative min-h-20 rounded-xl border border-slate-300 bg-white p-3 shadow-sm transition",
        seat.required ? "border-slate-300" : "border-dashed",
        isCaptainSeat ? "ring-2 ring-amber-400" : ""
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{displayLabel}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{member?.full_name ?? "Drop member here"}</p>
        </div>
        {seat.kind === "paddler" ? (
          <button
            type="button"
            draggable={canUpload}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", JSON.stringify({ type: "captain" }));
            }}
            onClick={() => onMoveCaptain?.(seat.key)}
            className={cn(
              "focus-ring inline-flex size-8 shrink-0 items-center justify-center rounded-lg border transition",
              isCaptainSeat
                ? "border-amber-300 bg-amber-100 text-amber-700"
                : "border-slate-200 bg-slate-50 text-slate-400 hover:text-amber-600"
            )}
            title="Captain seat"
          >
            <Star size={16} fill={isCaptainSeat ? "currentColor" : "none"} />
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={cn("text-xs font-medium", seat.required ? "text-rose-600" : "text-slate-500")}>
          {seat.required ? "Required" : "Optional"}
        </span>
        {member && canUpload ? (
          <button type="button" onClick={() => onClear(seat.key)} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function BoatBackdrop() {
  return (
    <div className="roster-boat-art" aria-hidden="true">
      <span className="roster-boat-hull" />
      <span className="roster-boat-prow" />
      <span className="roster-boat-stern" />
      {Array.from({ length: 10 }).map((_, index) => (
        <span key={`left-${index}`} className="roster-boat-paddle roster-boat-paddle-left" style={{ top: `${14 + index * 7.5}%` }} />
      ))}
      {Array.from({ length: 10 }).map((_, index) => (
        <span key={`right-${index}`} className="roster-boat-paddle roster-boat-paddle-right" style={{ top: `${14 + index * 7.5}%` }} />
      ))}
    </div>
  );
}

function MemberChip({ member, canUpload }: { member: TeamMember; canUpload: boolean }) {
  return (
    <div
      draggable={canUpload}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", JSON.stringify({ type: "member", memberId: member.id }));
      }}
      className={cn(
        "rounded-xl border bg-white p-3 shadow-sm",
        hasCompleteRosterProfile(member) ? "border-slate-200" : "border-amber-300 bg-amber-50"
      )}
    >
      <p className="font-semibold text-slate-900">{member.full_name}</p>
      <p className="mt-1 text-xs text-slate-500">
        {hasCompleteRosterProfile(member) ? "Profile ready" : "Needs roster details"}
      </p>
    </div>
  );
}

function StatusTile({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-3", ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-900">{value}</p>
    </div>
  );
}

function parseDragPayload(value: string) {
  try {
    const parsed = JSON.parse(value) as { type?: string; memberId?: string };
    if (parsed.type === "captain") return { type: "captain" as const };
    if (parsed.type === "member" && parsed.memberId) return { type: "member" as const, memberId: parsed.memberId };
    return null;
  } catch {
    return null;
  }
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return "Unable to complete the request.";
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? "Unable to complete the request.";
}
