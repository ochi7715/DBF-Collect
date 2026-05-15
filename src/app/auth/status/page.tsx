import Link from "next/link";
import { getAuthStatusCopy } from "@/lib/auth-redirects";

export default async function AuthStatusPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const copy = getAuthStatusCopy(code);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Dragon Boat Docs</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">{copy.title}</h1>
        <p className="mt-3 text-slate-600">{copy.body}</p>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Checklist</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Run <span className="font-mono">supabase/schema.sql</span> in Supabase SQL Editor.</li>
            <li>Add your deployed domain to Supabase Auth redirect URLs.</li>
            <li>Request a fresh signup, magic-link, or password-reset email after changing Auth settings.</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className="focus-ring rounded-xl bg-brand-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-brand-700">
            Back to sign in
          </Link>
          <Link href="/signup" className="focus-ring rounded-xl border border-slate-300 px-4 py-2.5 text-center font-semibold text-slate-700 hover:bg-slate-50">
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}
