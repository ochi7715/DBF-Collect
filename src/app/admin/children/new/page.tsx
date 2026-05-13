import Link from "next/link";
import { requireStaff } from "@/lib/auth";

export default async function NewChildPage() {
  await requireStaff();

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/admin/children" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
          Back to records
        </Link>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-brand-600">Child onboarding</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Create child record</h1>
        <p className="mt-2 text-slate-600">Create the child-centered record that intake documents and caregiver access attach to.</p>
      </div>

      <form action="/api/admin/children" method="post" className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">First name</span>
          <input name="firstName" required className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Last name</span>
          <input name="lastName" required className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Date of birth</span>
          <input name="dateOfBirth" type="date" className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Patient ID</span>
          <input name="externalPatientId" className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select name="status" defaultValue="intake" className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
            <option value="intake">Intake</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button className="focus-ring rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">Create record</button>
        </div>
      </form>
    </section>
  );
}
