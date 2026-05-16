import { requireStaff } from "@/lib/auth";
import { RACE_CATEGORY_RULE_OPTIONS, getRaceCategoryRuleSummary } from "@/lib/dragon-boat";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { RaceCategory } from "@/lib/types";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireStaff();
  const { status } = await searchParams;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("race_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  const categories = (data ?? []) as RaceCategory[];

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Back office</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Race categories</h1>
        <p className="mt-2 text-slate-600">Create race categories and choose the forms each one uses.</p>
      </div>

      {status ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          {getStatusCopy(status)}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <form action="/api/admin/categories" method="post" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">New category</h2>
          <CategoryFields submitLabel="Create category" />
        </form>

        <div className="grid gap-4">
          {categories.map((category) => (
            <article key={category.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">{category.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {category.is_active ? "Active" : "Inactive"} | {getRaceCategoryRuleSummary(category.rule_set)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button form={`category-${category.id}`} className="focus-ring rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Save category
                  </button>
                  <form action={`/api/admin/categories/${category.id}/delete`} method="post">
                    <button className="focus-ring rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
              <form id={`category-${category.id}`} action={`/api/admin/categories/${category.id}`} method="post">
                <CategoryFields category={category} submitLabel="Save category" hideSubmit />
              </form>
            </article>
          ))}
          {categories.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
              No race categories yet.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function getStatusCopy(status: string) {
  switch (status) {
    case "created":
      return "Race category created.";
    case "deleted":
      return "Race category deleted.";
    case "deactivated":
      return "Race category already had teams, so it was deactivated instead of deleted.";
    case "updated":
      return "Race category updated.";
    default:
      return "Race category saved.";
  }
}

function CategoryFields({
  category,
  submitLabel,
  hideSubmit = false,
}: {
  category?: RaceCategory;
  submitLabel: string;
  hideSubmit?: boolean;
}) {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="block md:col-span-2">
        <span className="text-sm font-medium text-slate-700">Name</span>
        <input name="name" required defaultValue={category?.name ?? ""} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm font-medium text-slate-700">Rule set</span>
        <select name="ruleSet" defaultValue={category?.rule_set ?? "regular"} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
          {RACE_CATEGORY_RULE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} - {option.summary}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Sort order</span>
        <input name="sortOrder" type="number" min="0" max="9999" defaultValue={category?.sort_order ?? 10} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>
      <label className="mt-7 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="isActive" defaultChecked={category?.is_active ?? true} className="size-4 rounded border-slate-300 text-brand-600" />
        Active
      </label>
      {!hideSubmit ? (
        <div className="md:col-span-2">
          <button className="focus-ring w-full rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">
            {submitLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
