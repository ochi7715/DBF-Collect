import type { TeamMember } from "@/lib/types";

export type RosterFormCode = "B1" | "B2";

export type SeatDefinition = {
  key: string;
  label: string;
  kind: "paddler" | "alternate" | "drummer" | "steersperson";
  required: boolean;
};

const B1_SEATS: SeatDefinition[] = [
  ...Array.from({ length: 20 }, (_, index) => ({
    key: `paddler-${index + 1}`,
    label: `Seat ${index + 1}`,
    kind: "paddler" as const,
    required: true,
  })),
  ...Array.from({ length: 4 }, (_, index) => ({
    key: `alternate-${index + 1}`,
    label: `Alternate ${index + 1}`,
    kind: "alternate" as const,
    required: false,
  })),
  { key: "drummer", label: "Drummer", kind: "drummer", required: true },
  { key: "steersperson", label: "Steersperson", kind: "steersperson", required: true },
];

const B2_SEATS: SeatDefinition[] = [
  ...Array.from({ length: 10 }, (_, index) => ({
    key: `paddler-${index + 1}`,
    label: `Seat ${index + 1}`,
    kind: "paddler" as const,
    required: true,
  })),
  ...Array.from({ length: 2 }, (_, index) => ({
    key: `alternate-${index + 1}`,
    label: `Alternate ${index + 1}`,
    kind: "alternate" as const,
    required: false,
  })),
  { key: "drummer", label: "Drummer", kind: "drummer", required: true },
  { key: "steersperson", label: "Steersperson", kind: "steersperson", required: true },
];

export const ROSTER_SEATS: Record<RosterFormCode, SeatDefinition[]> = {
  B1: B1_SEATS,
  B2: B2_SEATS,
};

export function getRosterSeatDefinitions(formCode: RosterFormCode) {
  return ROSTER_SEATS[formCode];
}

export function getRosterRequiredSeatKeys(formCode: RosterFormCode) {
  return getRosterSeatDefinitions(formCode)
    .filter((seat) => seat.required)
    .map((seat) => seat.key);
}

export function getRosterPaddlerSeatKeys(formCode: RosterFormCode) {
  return getRosterSeatDefinitions(formCode)
    .filter((seat) => seat.kind === "paddler")
    .map((seat) => seat.key);
}

export function sanitizeRosterLayout(formCode: RosterFormCode, layout: Record<string, string | null> | null | undefined) {
  const validSeats = new Set(getRosterSeatDefinitions(formCode).map((seat) => seat.key));
  const sanitized: Record<string, string | null> = {};

  for (const [seatKey, memberId] of Object.entries(layout ?? {})) {
    if (!validSeats.has(seatKey)) continue;
    sanitized[seatKey] = memberId || null;
  }

  return sanitized;
}

export function hasCompleteRosterProfile(member: TeamMember) {
  return Boolean(member.age && member.gender && member.telephone && member.photo_id_number);
}
