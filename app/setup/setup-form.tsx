"use client";

import { useActionState } from "react";
import { createBusiness } from "./actions";
import { FormMessage } from "@/components/form-message";
import { submitWithoutReset } from "@/lib/submit";
import { initialFormState } from "@/lib/forms";

export function SetupForm() {
  const [state, action, pending] = useActionState(createBusiness, initialFormState);
  return (
    <form onSubmit={submitWithoutReset(action)} className="card space-y-4">
      <div>
        <label className="label" htmlFor="name">Business name</label>
        <input id="name" name="name" className="input" placeholder="e.g. Chanda General Dealers" required />
      </div>
      <FormMessage state={state} />
      <button className="btn w-full" disabled={pending}>
        {pending ? "Creating…" : "Create my business"}
      </button>
    </form>
  );
}
