"use client";

import { useRouter } from "next/navigation";
import type { ChildWithCaregiverAccess } from "@/lib/types";

export function ChildSwitcher({ childrenList, currentChildId }: { childrenList: ChildWithCaregiverAccess[]; currentChildId: string }) {
  const router = useRouter();

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">Selected child</span>
      <select
        value={currentChildId}
        onChange={(event) => router.push(`/portal/children/${event.target.value}/documents`)}
        className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
      >
        {childrenList.map((child) => (
          <option key={child.id} value={child.id}>
            {child.first_name} {child.last_name}
          </option>
        ))}
      </select>
    </label>
  );
}
