"use client";

import { useActionState } from "react";
import { recordSale } from "./actions";
import { FormMessage } from "@/components/form-message";
import { ItemLines, type ProductOption } from "@/components/item-lines";
import { submitWithoutReset } from "@/lib/submit";
import { initialFormState, PAYMENT_METHODS } from "@/lib/forms";

export function SaleForm({ products, requestId, today }:
  { products: ProductOption[]; requestId: string; today: string }) {
  const [state, action, pending] = useActionState(recordSale, initialFormState);

  return (
    // key={requestId}: after a successful save the page sends a new id,
    // which clears the form for the next sale.
    <form key={requestId} onSubmit={submitWithoutReset(action)} className="card space-y-4">
      <h2 className="text-lg font-semibold">Record a sale</h2>
      <input type="hidden" name="request_id" value={requestId} />
      <ItemLines products={products} priceLabel="Price (K)" usePrice="selling_price" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="payment_method">Paid by</label>
          <select id="payment_method" name="payment_method" className="input" defaultValue="cash">
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="customer_name">Customer (needed for credit)</label>
          <input id="customer_name" name="customer_name" className="input" placeholder="Walk-in customer" />
        </div>
        <div>
          <label className="label" htmlFor="sale_date">Date</label>
          <input id="sale_date" name="sale_date" type="date" className="input" defaultValue={today} />
        </div>
      </div>
      <FormMessage state={state} />
      <button className="btn w-full sm:w-auto" disabled={pending || !products.length}>
        {pending ? "Saving…" : "Save sale"}
      </button>
      {!products.length && <p className="text-sm text-slate-500">Add a product with stock first.</p>}
    </form>
  );
}
