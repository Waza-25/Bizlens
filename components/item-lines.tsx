"use client";

import { useState } from "react";
import { formatMoney, linesTotal } from "@/lib/calc";

export type ProductOption = {
  id: string;
  name: string;
  qty_on_hand: number;
  selling_price: number;
  avg_cost: number;
};

type Row = { product_id: string; quantity: string; price: string };

// Lets the user add several products to one sale or stock receipt.
// The rows are sent to the server as JSON in a hidden "items" field.
export function ItemLines({
  products,
  priceLabel,
  usePrice,
}: {
  products: ProductOption[];
  priceLabel: string;
  usePrice: "selling_price" | "avg_cost";
}) {
  const [rows, setRows] = useState<Row[]>([{ product_id: "", quantity: "1", price: "" }]);

  function update(index: number, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        // Picking a product fills in its usual price
        if (patch.product_id) {
          const p = products.find((x) => x.id === patch.product_id);
          if (p) next.price = String(Number(p[usePrice]) || "");
        }
        return next;
      }),
    );
  }

  const total = linesTotal(
    rows.map((r) => ({ quantity: Number(r.quantity) || 0, price: Number(r.price) || 0 })),
  );

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-12 gap-2">
          <select
            aria-label="Product"
            className="input col-span-12 sm:col-span-6"
            value={row.product_id}
            onChange={(e) => update(i, { product_id: e.target.value })}
            required
          >
            <option value="">Choose product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (in stock: {Number(p.qty_on_hand)})
              </option>
            ))}
          </select>
          <input
            aria-label="Quantity"
            className="input col-span-4 sm:col-span-2"
            type="number" min="0.001" step="any" inputMode="decimal"
            value={row.quantity}
            onChange={(e) => update(i, { quantity: e.target.value })}
            required
          />
          <input
            aria-label={priceLabel}
            placeholder={priceLabel}
            className="input col-span-5 sm:col-span-3"
            type="number" min="0" step="0.01" inputMode="decimal"
            value={row.price}
            onChange={(e) => update(i, { price: e.target.value })}
            required
          />
          <button
            type="button"
            aria-label="Remove line"
            className="btn-light col-span-3 sm:col-span-1"
            onClick={() => setRows((r) => (r.length > 1 ? r.filter((_, j) => j !== i) : r))}
          >
            ✕
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="btn-light"
          onClick={() => setRows((r) => [...r, { product_id: "", quantity: "1", price: "" }])}
        >
          + Add another item
        </button>
        <p className="text-lg font-semibold">Total: {formatMoney(total)}</p>
      </div>

      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          rows.map((r) => ({
            product_id: r.product_id,
            quantity: Number(r.quantity),
            price: Number(r.price),
          })),
        )}
      />
    </div>
  );
}
