"use client";

import { useActionState } from "react";
import { addProduct } from "./actions";
import { FormMessage } from "@/components/form-message";
import { submitWithoutReset } from "@/lib/submit";
import { initialFormState } from "@/lib/forms";

export function ProductForm({ formKey }: { formKey: string }) {
  const [state, action, pending] = useActionState(addProduct, initialFormState);

  return (
    // The page sends a new formKey after each save, which clears the form.
    <form key={formKey} onSubmit={submitWithoutReset(action)} className="card grid gap-4 sm:grid-cols-2">
      <h2 className="text-lg font-semibold sm:col-span-2">Add a product</h2>
      <Field name="name" label="Product name" required className="sm:col-span-2" />
      <Field name="sku" label="Code / barcode (optional)" />
      <Field name="unit" label="Unit (each, kg, litre…)" defaultValue="each" />
      <Field name="selling_price" label="Selling price (K)" type="number" step="0.01" required />
      <Field name="reorder_level" label="Warn me when stock falls to" type="number" step="any" defaultValue="0" />
      <Field name="opening_qty" label="Opening stock quantity" type="number" step="any" defaultValue="0" />
      <Field name="opening_cost" label="Cost per unit of opening stock (K)" type="number" step="0.01" defaultValue="0" />
      <div className="space-y-3 sm:col-span-2">
        <FormMessage state={state} />
        <button className="btn w-full sm:w-auto" disabled={pending}>
          {pending ? "Saving…" : "Save product"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, name, className = "", ...rest }:
  { label: string; name: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} className="input" min={rest.type === "number" ? 0 : undefined} {...rest} />
    </div>
  );
}
