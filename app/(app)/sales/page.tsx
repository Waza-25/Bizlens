import { requireBusiness } from "@/lib/business";
import { formatMoney, todayInZambia } from "@/lib/calc";
import { SaleForm } from "./sale-form";

const METHOD: Record<string, string> = { cash: "Cash", mobile_money: "Mobile money", bank: "Bank", credit: "Credit" };

export default async function SalesPage() {
  const { supabase, business } = await requireBusiness();

  const [{ data: products }, { data: sales }] = await Promise.all([
    supabase.from("products").select("id, name, qty_on_hand, selling_price, avg_cost")
      .eq("business_id", business.id).gt("qty_on_hand", 0).order("name"),
    supabase.from("sales").select("id, sale_date, customer_name, payment_method, total, cost_of_sales")
      .eq("business_id", business.id).order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <>
      <h1 className="text-2xl font-bold">Sales</h1>
      <SaleForm products={products ?? []} requestId={crypto.randomUUID()}
                today={todayInZambia()} />
      <section className="card overflow-x-auto">
        <h2 className="mb-2 font-semibold">Recent sales</h2>
        <table className="table">
          <thead><tr><th>Date</th><th>Customer</th><th>Paid by</th><th>Total</th><th>Gross profit</th></tr></thead>
          <tbody>
            {(sales ?? []).map((s) => (
              <tr key={s.id}>
                <td>{s.sale_date}</td>
                <td>{s.customer_name ?? "Walk-in"}</td>
                <td>{METHOD[s.payment_method]}</td>
                <td>{formatMoney(s.total)}</td>
                <td>{formatMoney(Number(s.total) - Number(s.cost_of_sales))}</td>
              </tr>
            ))}
            {!sales?.length && <tr><td colSpan={5} className="py-6 text-center text-slate-500">No sales yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
