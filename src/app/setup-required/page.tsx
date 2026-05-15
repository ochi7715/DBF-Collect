import Link from "next/link";
import { BrandLockup } from "@/components/brand-lockup";

export default function SetupRequiredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <BrandLockup />
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Supabase setup required</h1>
        <p className="mt-3 text-slate-600">
          The portal needs Supabase environment variables before protected pages like the admin back office can load.
        </p>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Required Vercel environment variables</p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-white">{`NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL`}</pre>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="focus-ring rounded-xl border border-slate-300 px-4 py-2.5 text-center font-semibold text-slate-700 hover:bg-slate-50">
            Back home
          </Link>
          <a
            href="https://vercel.com/docs/environment-variables"
            className="focus-ring rounded-xl bg-brand-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-brand-700"
          >
            Vercel env docs
          </a>
        </div>
      </section>
    </main>
  );
}
