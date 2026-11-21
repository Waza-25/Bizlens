"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";
import { FormMessage } from "@/components/form-message";
import { submitWithoutReset } from "@/lib/submit";
import { initialFormState } from "@/lib/forms";

export function LoginForm() {
  const [state, action, pending] = useActionState(authenticate, initialFormState);

  return (
    <form onSubmit={submitWithoutReset(action)} className="card space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" minLength={8}
               autoComplete="current-password" className="input" required />
      </div>
      <FormMessage state={state} />
      <div className="grid grid-cols-2 gap-3">
        <button name="mode" value="signin" className="btn" disabled={pending}>
          {pending ? "Please wait…" : "Sign in"}
        </button>
        <button name="mode" value="signup" className="btn-light" disabled={pending}>
          Create account
        </button>
      </div>
    </form>
  );
}
