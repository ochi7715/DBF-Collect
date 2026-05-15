import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getRosterPaddlerSeatKeys,
  sanitizeRosterLayout,
  type RosterFormCode,
} from "@/lib/roster-config";
import { upsertTeamFormRoster } from "@/lib/rosters";

const formCodeSchema = z.enum(["B1", "B2"]);
const rosterPayloadSchema = z.object({
  layout: z.record(z.string(), z.string().uuid().nullable()),
  captainSeatKey: z.string().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; formCode: string }> }
) {
  const { teamId, formCode } = await params;
  const parsedFormCode = formCodeSchema.safeParse(formCode);
  if (!parsedFormCode.success) return NextResponse.json({ error: "Invalid form code" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: allowed, error: allowedError } = await supabase.rpc("can_upload_team_documents", {
    target_team_id: teamId,
  });
  if (allowedError || !allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsedPayload = rosterPayloadSchema.safeParse(json);
  if (!parsedPayload.success) return NextResponse.json({ error: "Invalid roster payload" }, { status: 400 });

  const sanitizedLayout = sanitizeRosterLayout(parsedFormCode.data, parsedPayload.data.layout);
  const paddlerSeatKeys = new Set(getRosterPaddlerSeatKeys(parsedFormCode.data));
  if (parsedPayload.data.captainSeatKey && !paddlerSeatKeys.has(parsedPayload.data.captainSeatKey)) {
    return NextResponse.json({ error: "Captain must be assigned to a paddler seat" }, { status: 400 });
  }

  const roster = await upsertTeamFormRoster({
    teamId,
    formCode: parsedFormCode.data as RosterFormCode,
    layout: sanitizedLayout,
    captainSeatKey: parsedPayload.data.captainSeatKey,
    createdBy: user.id,
  });

  await writeAuditLog({
    actorId: user.id,
    teamId,
    entityType: "team_form_roster",
    entityId: roster.id,
    action: "team_form_roster_saved",
    details: {
      formCode: parsedFormCode.data,
      captainSeatKey: roster.captain_seat_key,
      assignedSeatCount: Object.values(roster.layout).filter(Boolean).length,
    },
    request,
  });

  return NextResponse.json({ ok: true, roster });
}
