"use client";

import { useActionState } from "react";
import { receiveStock } from "./actions";
import { FormMessage } from "@/components/form-message";
import { ItemLines, type ProductOption } from "@/components/item-lines";
import { submitWithoutReset } from "@/lib/submit";
import { initialFormState, PAYMENT_METHODS } from "@/lib/forms";

export function ReceiveForm({ products, requestId, today }:
  { products: ProductOption[]; requestId: string; today: string }) {
  const [state, action, pending] = useActionState(receiveStock, initialFormState);

  return (
    <form key={requestId} onSubmit={submitWithoutReset(action)} className="card space-y-4">
      <h2 className="text-lg font-semibold">Receive stock from a supplier</h2>
      <input type="hidden" name="request_id" value={requestId} />
      <ItemLines products={products} priceLabel="Cost per unit (K)" usePrice="avg_cost" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="supplier_name">Supplier</label>
          <input id="supplier_name" name="supplier_name" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="reference">Invoice / delivery note no.</label>
          <input id="reference" name="reference" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="payment_method">Paid by</label>
          <select id="payment_method" name="payment_method" className="input" defaultValue="cash">
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="receipt_date">Date received</label>
          <input id="receipt_date" name="receipt_date" type="date" className="input" defaultValue={today} />
        </div>
      </div>
      <FormMessage state={state} />
      <button className="btn w-full sm:w-auto" disabled={pending || !products.length}>
        {pending ? "Saving…" : "Save stock received"}
      </button>
    </form>
  );
}
