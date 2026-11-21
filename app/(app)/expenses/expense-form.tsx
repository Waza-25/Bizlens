"use client";

import { useActionState } from "react";
import { recordExpense } from "./actions";
import { FormMessage } from "@/components/form-message";
import { submitWithoutReset } from "@/lib/submit";
import { EXPENSE_CATEGORIES, initialFormState, PAYMENT_METHODS } from "@/lib/forms";

export function ExpenseForm({ requestId, today }: { requestId: string; today: string }) {
  const [state, action, pending] = useActionState(recordExpense, initialFormState);

  return (
    <form key={requestId} onSubmit={submitWithoutReset(action)} className="card grid gap-4 sm:grid-cols-2">
      <h2 className="text-lg font-semibold sm:col-span-2">Record an expense</h2>
      <input type="hidden" name="request_id" value={requestId} />
      <div>
        <label className="label" htmlFor="category">Category</label>
        <select id="category" name="category" className="input">
          {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="amount">Amount (K)</label>
        <input id="amount" name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" className="input" required />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="description">What was it for?</label>
        <input id="description" name="description" className="input" placeholder="e.g. ZESCO units for the shop" />
      </div>
      <div>
        <label className="label" htmlFor="payment_method">Paid by</label>
        <select id="payment_method" name="payment_method" className="input" defaultValue="cash">
          {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="expense_date">Date</label>
        <input id="expense_date" name="expense_date" type="date" className="input" defaultValue={today} />
      </div>
      <div className="space-y-3 sm:col-span-2">
        <FormMessage state={state} />
        <button className="btn w-full sm:w-auto" disabled={pending}>{pending ? "Saving…" : "Save expense"}</button>
      </div>
    </form>
  );
}
