import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { ensureTeamDocuments } from "@/lib/documents";
import {
  generateFilledPdf,
  validateRosterForGeneration,
  type GeneratedFormCode,
} from "@/lib/form-generation";
import { getRequiredTeamFormCodes } from "@/lib/dragon-boat";
import { sanitizeRosterLayout } from "@/lib/roster-config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const formCodeSchema = z.enum(["A1", "A2", "B1", "B2"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; formCode: string }> }
) {
  const { teamId, formCode } = await params;
  const parsedFormCode = formCodeSchema.safeParse(formCode);
  if (!parsedFormCode.success) return NextResponse.json({ error: "Invalid form code" }, { status: 400 });

  const actor = await requireStaff();
  const admin = createSupabaseAdminClient();
  const [
    { data: team, error: teamError },
    { data: contacts, error: contactsError },
    { data: members, error: membersError },
    { data: savedRoster, error: savedRosterError },
  ] =
    await Promise.all([
      admin.from("teams").select("*, race_categories(*)").eq("id", teamId).single(),
      admin
        .from("team_contacts")
        .select("contact_role, profiles(full_name, email)")
        .eq("team_id", teamId)
        .eq("is_authorized", true),
      admin.from("team_members").select("*").eq("team_id", teamId).order("full_name", { ascending: true }),
      parsedFormCode.data === "B1" || parsedFormCode.data === "B2"
        ? admin
            .from("team_form_rosters")
            .select("layout, captain_seat_key")
            .eq("team_id", teamId)
            .eq("form_code", parsedFormCode.data)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (teamError || !team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (contactsError || membersError || savedRosterError) return NextResponse.json({ error: "Unable to load team data" }, { status: 500 });

  const requiredCodes = getRequiredTeamFormCodes(team.race_categories?.rule_set);
  if (!requiredCodes.includes(parsedFormCode.data)) {
    return NextResponse.json({ error: `Form ${parsedFormCode.data} is not required for this team category.` }, { status: 400 });
  }

  let roster:
    | {
        layout: Record<string, string | null>;
        captainSeatKey: string | null;
      }
    | undefined;

  if (parsedFormCode.data === "B1" || parsedFormCode.data === "B2") {
    if (!savedRoster) return NextResponse.json({ error: "A saved seating layout is required." }, { status: 400 });

    roster = {
      layout: sanitizeRosterLayout(parsedFormCode.data, savedRoster.layout),
      captainSeatKey: savedRoster.captain_seat_key ?? null,
    };

    const rosterProblems = validateRosterForGeneration({
      formCode: parsedFormCode.data,
      members: members ?? [],
      roster,
    });
    if (rosterProblems.length > 0) {
      return NextResponse.json({ error: rosterProblems[0], issues: rosterProblems }, { status: 400 });
    }
  }

  await ensureTeamDocuments(teamId);
  const { data: document, error: documentError } = await admin
    .from("dragon_boat_documents")
    .select("id")
    .eq("team_id", teamId)
    .eq("form_code", parsedFormCode.data)
    .is("team_member_id", null)
    .single();
  if (documentError || !document) return NextResponse.json({ error: "Document record not found" }, { status: 404 });

  try {
    const normalizedContacts = (contacts ?? []).map((contact) => ({
      contact_role: contact.contact_role,
      profiles: Array.isArray(contact.profiles) ? contact.profiles[0] ?? null : contact.profiles,
    }));
    const pdfBytes = await generateFilledPdf({
      formCode: parsedFormCode.data as GeneratedFormCode,
      team,
      contacts: normalizedContacts,
      members: members ?? [],
      roster,
    });
    const fileName = `${sanitizeFileName(team.name)}-Form-${parsedFormCode.data}.pdf`;
    const storagePath = `${teamId}/${document.id}-generated-${Date.now()}.pdf`;

    const { error: uploadError } = await admin.storage.from("race-documents").upload(storagePath, Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { error: updateError } = await admin
      .from("dragon_boat_documents")
      .update({
        status: "uploaded",
        uploaded_by: actor.id,
        file_path: storagePath,
        file_name: fileName,
        mime_type: "application/pdf",
        file_size_bytes: pdfBytes.length,
        review_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    await writeAuditLog({
      actorId: actor.id,
      teamId,
      entityType: "dragon_boat_document",
      entityId: document.id,
      action: "document_generated",
      details: {
        formCode: parsedFormCode.data,
        fileName,
        fileSize: pdfBytes.length,
      },
      request,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate PDF.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function sanitizeFileName(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "team";
}
