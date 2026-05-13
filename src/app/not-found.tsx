import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">Page not found</h1>
        <p className="mt-2 text-slate-600">The record you requested could not be found.</p>
        <Link href="/portal" className="mt-6 inline-block rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white">Go home</Link>
      </div>
    </main>
  );
}
