import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { ensureChildChecklist } from "@/lib/documents";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const childSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(120),
  lastName: z.string().trim().min(1, "Last name is required").max(120),
  dateOfBirth: z.string().trim().optional(),
  externalPatientId: z.string().trim().max(80).optional(),
  status: z.string().trim().min(1).max(80).default("intake"),
});

export async function POST(request: Request) {
  const profile = await requireStaff();
  const formData = await request.formData();
  const parsed = childSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth")?.toString() ?? "",
    externalPatientId: formData.get("externalPatientId")?.toString() ?? "",
    status: formData.get("status")?.toString() ?? "intake",
  });

  const admin = createSupabaseAdminClient();
  const { data: child, error } = await admin
    .from("children")
    .insert({
      first_name: parsed.firstName,
      last_name: parsed.lastName,
      date_of_birth: parsed.dateOfBirth || null,
      external_patient_id: parsed.externalPatientId || null,
      status: parsed.status,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) throw error;

  await ensureChildChecklist(child.id);

  await writeAuditLog({
    actorId: profile.id,
    childId: child.id,
    entityType: "child",
    entityId: child.id,
    action: "child_created",
    details: {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      externalPatientId: parsed.externalPatientId || null,
    },
    request,
  });

  redirect(`/admin/children/${child.id}`);
}
