"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";

type AccountMenuProps = {
  avatarUrl?: string | null;
  email: string;
  initials: string;
  name: string;
  role: string;
};

export function AccountMenu({ avatarUrl, email, initials, name, role }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarStyle = getAvatarStyle(avatarUrl);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className="focus-ring flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 pr-2 text-left shadow-sm transition hover:bg-slate-50"
      >
        <span className="flex size-10 items-center justify-center overflow-hidden rounded-2xl bg-brand-600 bg-cover bg-center text-sm font-bold text-white" style={avatarStyle}>
          {avatarStyle ? null : initials}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-40 truncate text-sm font-semibold leading-tight text-slate-900">{name}</span>
          <span className="block text-xs capitalize leading-tight text-slate-500">{role}</span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center overflow-hidden rounded-2xl bg-brand-600 bg-cover bg-center text-sm font-bold text-white" style={avatarStyle}>
                {avatarStyle ? null : initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{name}</p>
                <p className="truncate text-xs text-slate-500">{email}</p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Settings className="size-4" />
              Profile settings
            </Link>
            <Link
              href="/account#security"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <UserRound className="size-4" />
              Change password
            </Link>
            <form action="/auth/sign-out" method="post" className="mt-1 border-t border-slate-100 pt-1">
              <button
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getAvatarStyle(avatarUrl?: string | null): CSSProperties | undefined {
  if (!avatarUrl) return undefined;

  try {
    const parsed = new URL(avatarUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
  } catch {
    return undefined;
  }

  return { backgroundImage: `url("${avatarUrl.replaceAll('"', "%22")}")` };
}
