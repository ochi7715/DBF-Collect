import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const childUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  dateOfBirth: z.string().trim().optional(),
  externalPatientId: z.string().trim().max(80).optional(),
  status: z.string().trim().min(1).max(80),
});

export async function POST(request: Request, { params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const profile = await requireStaff();
  const formData = await request.formData();
  const parsed = childUpdateSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth")?.toString() ?? "",
    externalPatientId: formData.get("externalPatientId")?.toString() ?? "",
    status: formData.get("status")?.toString() ?? "intake",
  });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("children")
    .update({
      first_name: parsed.firstName,
      last_name: parsed.lastName,
      date_of_birth: parsed.dateOfBirth || null,
      external_patient_id: parsed.externalPatientId || null,
      status: parsed.status,
    })
    .eq("id", childId);

  if (error) throw error;

  await writeAuditLog({
    actorId: profile.id,
    childId,
    entityType: "child",
    entityId: childId,
    action: "child_updated",
    details: parsed,
    request,
  });

  redirect(`/admin/children/${childId}`);
}
