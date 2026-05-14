import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const reviewSchema = z.object({
  status: z.enum(["in_review", "accepted", "rejected", "completed"]),
  reviewNotes: z.string().max(3000).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const profile = await requireStaff();
  const formData = await request.formData();
  const parsed = reviewSchema.parse({
    status: formData.get("status"),
    reviewNotes: formData.get("reviewNotes")?.toString() ?? "",
  });

  const admin = createSupabaseAdminClient();
  const { data: doc } = await admin.from("child_intake_documents").select("child_id").eq("id", documentId).single();

  const { error } = await admin
    .from("child_intake_documents")
    .update({
      status: parsed.status,
      reviewed_by: profile.id,
      review_notes: parsed.reviewNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (error) throw error;

  await writeAuditLog({
    actorId: profile.id,
    childId: doc?.child_id,
    entityType: "child_intake_document",
    entityId: documentId,
    action: "document_reviewed",
    details: parsed,
    request,
  });

  redirect(`/admin/documents/${documentId}`);
}
