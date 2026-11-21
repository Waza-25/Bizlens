import { requireBusiness } from "@/lib/business";
import { formatMoney, todayInZambia } from "@/lib/calc";
import { ReceiveForm } from "./receive-form";

export default async function StockPage() {
  const { supabase, business } = await requireBusiness();

  const [{ data: products }, { data: receipts }] = await Promise.all([
    supabase.from("products").select("id, name, qty_on_hand, selling_price, avg_cost")
      .eq("business_id", business.id).order("name"),
    supabase.from("purchases").select("id, receipt_date, supplier_name, reference, payment_method, total")
      .eq("business_id", business.id).order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <>
      <h1 className="text-2xl font-bold">Stock in</h1>
      <ReceiveForm products={products ?? []} requestId={crypto.randomUUID()} today={todayInZambia()} />
      <section className="card overflow-x-auto">
        <h2 className="mb-2 font-semibold">Recent stock received</h2>
        <table className="table">
          <thead><tr><th>Date</th><th>Supplier</th><th>Reference</th><th>Owed?</th><th>Total</th></tr></thead>
          <tbody>
            {(receipts ?? []).map((r) => (
              <tr key={r.id}>
                <td>{r.receipt_date}</td>
                <td>{r.supplier_name ?? "-"}</td>
                <td>{r.reference ?? "-"}</td>
                <td>{r.payment_method === "credit" ? "Yes, on credit" : "Paid"}</td>
                <td>{formatMoney(r.total)}</td>
              </tr>
            ))}
            {!receipts?.length && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Nothing received yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
