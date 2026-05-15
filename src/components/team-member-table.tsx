"use client";

import { useMemo, useState } from "react";
import { hasCompleteRosterProfile } from "@/lib/roster-config";
import { formatDate } from "@/lib/utils";
import type { TeamMember } from "@/lib/types";

type SortMode = "alphabetical" | "added";

export function TeamMemberTable({
  teamId,
  members,
  canUpload,
}: {
  teamId: string;
  members: TeamMember[];
  canUpload: boolean;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("alphabetical");
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (sortMode === "added") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return a.full_name.localeCompare(b.full_name);
    });
  }, [members, sortMode]);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold text-slate-950">Team members</h3>
          <p className="mt-1 text-sm text-slate-600">Update the roster details used in generated B forms.</p>
        </div>
        <label className="block">
          <span className="sr-only">Sort team members</span>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="focus-ring rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            <option value="alphabetical">Member name (A-Z)</option>
            <option value="added">Order added</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Member name</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Telephone #</th>
              <th className="px-4 py-3">Photo ID #</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3">Status</th>
              {canUpload ? <th className="px-4 py-3 text-right">Action</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {sortedMembers.map((member) => {
              const formId = `member-form-${member.id}`;
              const ready = hasCompleteRosterProfile(member);
              return (
                <tr key={member.id} className="align-top">
                  <td className="px-4 py-3">
                    {canUpload ? (
                      <input
                        form={formId}
                        name="fullName"
                        required
                        maxLength={160}
                        defaultValue={member.full_name}
                        className="focus-ring w-44 rounded-xl border border-slate-300 px-3 py-2"
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">{member.full_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canUpload ? (
                      <input
                        form={formId}
                        name="age"
                        type="number"
                        min={1}
                        max={130}
                        defaultValue={member.age ?? ""}
                        className="focus-ring w-20 rounded-xl border border-slate-300 px-3 py-2"
                      />
                    ) : (
                      member.age ?? "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canUpload ? (
                      <select
                        form={formId}
                        name="gender"
                        defaultValue={member.gender ?? ""}
                        className="focus-ring w-28 rounded-xl border border-slate-300 bg-white px-3 py-2"
                      >
                        <option value="">Select</option>
                        <option value="F">Female</option>
                        <option value="M">Male</option>
                      </select>
                    ) : (
                      member.gender ?? "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canUpload ? (
                      <input
                        form={formId}
                        name="telephone"
                        maxLength={40}
                        defaultValue={member.telephone ?? ""}
                        className="focus-ring w-40 rounded-xl border border-slate-300 px-3 py-2"
                      />
                    ) : (
                      member.telephone ?? "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canUpload ? (
                      <input
                        form={formId}
                        name="photoIdNumber"
                        maxLength={80}
                        defaultValue={member.photo_id_number ?? ""}
                        className="focus-ring w-40 rounded-xl border border-slate-300 px-3 py-2"
                      />
                    ) : (
                      member.photo_id_number ?? "-"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(member.created_at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        ready
                          ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                          : "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"
                      }
                    >
                      {ready ? "Ready" : "Needs details"}
                    </span>
                  </td>
                  {canUpload ? (
                    <td className="px-4 py-3 text-right">
                      <button
                        form={formId}
                        className="focus-ring rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Save
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedMembers.map((member) => (
        <form
          key={member.id}
          id={`member-form-${member.id}`}
          action={`/api/teams/${teamId}/members/${member.id}`}
          method="post"
        />
      ))}
    </div>
  );
}
