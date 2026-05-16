"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AppNavigation } from "@/components/app-navigation";

export function MobileNavigation({ admin, staff }: { admin: boolean; staff: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-controls="mobile-navigation"
        aria-expanded={open}
        aria-label={open ? "Close navigation" : "Open navigation"}
        onClick={() => setOpen((current) => !current)}
        className="focus-ring fixed left-0 top-[4.65rem] z-30 inline-flex items-center justify-center rounded-r-2xl border border-l-0 border-slate-200 bg-white px-3 py-3 text-slate-700 shadow-sm lg:hidden"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 bg-slate-950/35 backdrop-blur-sm lg:hidden"
          />
          <aside
            id="mobile-navigation"
            className="fixed bottom-0 left-0 top-16 z-30 w-[min(18rem,calc(100vw-2rem))] overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-xl lg:hidden"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Menu</p>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                className="focus-ring inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <X size={16} />
              </button>
            </div>
            <AppNavigation admin={admin} staff={staff} onNavigate={() => setOpen(false)} />
          </aside>
        </>
      ) : null}
    </>
  );
}
