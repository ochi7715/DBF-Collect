import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  PracticeAssignmentKind,
  PracticeSlotCapacity,
  TeamPracticeAssignment,
  TeamPracticeAttendance,
  TeamPracticeSeatingChart,
} from "@/lib/types";

export const PRACTICE_SLOT_OPTIONS = Array.from({ length: 13 }, (_, index) => {
  const totalMinutes = 10 * 60 + index * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

export const PRACTICE_ASSIGNMENT_KINDS: PracticeAssignmentKind[] = ["primary", "additional"];

export function getPracticeSlotInputName(slot: string) {
  return `capacity_${slot.replace(":", "")}`;
}

export function normalizePracticeSlot(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  const short = trimmed.slice(0, 5);
  return PRACTICE_SLOT_OPTIONS.includes(short) ? short : null;
}

export function formatPracticeSlotLabel(value: string | null | undefined) {
  const normalized = normalizePracticeSlot(value);
  if (!normalized) return "No slot assigned";
  const [hours, minutes] = normalized.split(":").map(Number);
  const date = new Date(2026, 0, 1, hours, minutes);
  const start = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  const endDate = new Date(date.getTime() + 60 * 60 * 1000);
  const end = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(endDate);
  return `${start} - ${end}`;
}

export function getPracticeAssignmentKindLabel(kind: PracticeAssignmentKind) {
  return kind === "additional" ? "Additional slot" : "Primary slot";
}

export function getUpcomingPracticeWeeks(count = 4, today = new Date()) {
  const firstWeek = getPracticeWeekStart(today);
  return Array.from({ length: count }, (_, index) => addDays(firstWeek, index * 7));
}

export function getPracticeWeekStart(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

export function formatPracticeWeekLabel(value: Date | string) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function toDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getPracticeSlotCapacities() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("practice_slot_capacities")
    .select("*")
    .order("slot_start_time", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PracticeSlotCapacity[];
}

export function isMissingPracticeSchemaError(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  return (
    candidate?.code === "42P01" ||
    candidate?.code === "PGRST205" ||
    Boolean(candidate?.message?.includes("practice_slot_capacities")) ||
    Boolean(candidate?.message?.includes("team_practice_assignments")) ||
    Boolean(candidate?.message?.includes("team_practice_attendance")) ||
    Boolean(candidate?.message?.includes("team_practice_seating_charts")) ||
    Boolean(candidate?.message?.includes("assignment_kind"))
  );
}

export async function getPracticeAssignmentsForTeams(teamIds: string[]) {
  if (teamIds.length === 0) return [] as TeamPracticeAssignment[];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("team_practice_assignments")
    .select("*")
    .in("team_id", teamIds);

  if (error) throw error;
  return (data ?? []) as TeamPracticeAssignment[];
}

export async function getPracticeAttendanceForTeams(teamIds: string[], weekStarts: string[]) {
  if (teamIds.length === 0 || weekStarts.length === 0) return [] as TeamPracticeAttendance[];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("team_practice_attendance")
    .select("*")
    .in("team_id", teamIds)
    .in("practice_week_start", weekStarts);

  if (error) throw error;
  return (data ?? []) as TeamPracticeAttendance[];
}

export async function getPracticeSeatingChartsForTeams(teamIds: string[], weekStarts: string[]) {
  if (teamIds.length === 0 || weekStarts.length === 0) return [] as TeamPracticeSeatingChart[];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("team_practice_seating_charts")
    .select("*")
    .in("team_id", teamIds)
    .in("practice_week_start", weekStarts);

  if (error) throw error;
  return (data ?? []) as TeamPracticeSeatingChart[];
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}
