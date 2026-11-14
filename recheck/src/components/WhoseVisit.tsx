"use client";

import { useActionState, useState } from "react";
import type { FamilyMemberState } from "@/app/(app)/visits/[id]/actions";

type Action = (state: FamilyMemberState, formData: FormData) => Promise<FamilyMemberState>;

type Props = {
  members: { id: string; name: string }[];
  currentId: string | null;
  chooseAction: Action;
  addAction: Action;
};

export function WhoseVisit({ members, currentId, chooseAction, addAction }: Props) {
  const [addingSomeone, setAddingSomeone] = useState(false);
  const [chooseState, choose, choosing] = useActionState(chooseAction, {});
  const [addState, add, adding] = useActionState(
    async (previous: FamilyMemberState, formData: FormData) => {
      const result = await addAction(previous, formData);
      if (!result.error) setAddingSomeone(false);
      return result;
    },
    {},
  );

  return (
    <div className="mt-4 flex flex-col gap-2 text-sm">
      <form action={choose} className="flex flex-wrap items-center gap-2">
        <label htmlFor="familyMemberId" className="font-medium">
          Whose visit?
        </label>
        <select
          id="familyMemberId"
          name="familyMemberId"
          defaultValue={currentId ?? ""}
          key={currentId ?? "none"}
          disabled={choosing}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="rounded-lg border border-slate-300 px-2 py-1.5"
        >
          <option value="">Not set</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        {!addingSomeone && (
          <button type="button" onClick={() => setAddingSomeone(true)} className="underline">
            Add someone
          </button>
        )}
      </form>

      {addingSomeone && (
        <form action={add} className="flex flex-wrap items-center gap-2">
          <input
            name="name"
            aria-label="Family member name"
            placeholder="Their name"
            autoFocus
            className="rounded-lg border border-slate-300 px-2 py-1.5"
          />
          <button disabled={adding} className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white disabled:opacity-60">
            {adding ? "Adding…" : "Add"}
          </button>
          <button type="button" onClick={() => setAddingSomeone(false)} className="underline">
            Cancel
          </button>
        </form>
      )}

      {(chooseState.error ?? addState.error) && (
        <p role="alert" className="text-red-700">
          {chooseState.error ?? addState.error}
        </p>
      )}
    </div>
  );
}
