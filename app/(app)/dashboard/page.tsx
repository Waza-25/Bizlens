import Link from "next/link";
import { requireBusiness } from "@/lib/business";
import { formatMoney, grossProfit, todayInZambia } from "@/lib/calc";

type Summary = {
  sales: number; cost_of_sales: number; expenses: number; cash: number;
  receivables: number; payables: number; inventory_value: number; low_stock: number;
};

export default async function DashboardPage() {
  const { supabase, business } = await requireBusiness();

  const today = todayInZambia();
  const monthStart = today.slice(0, 8) + "01";

  const [{ data, error }, { data: lowStock }] = await Promise.all([
    supabase.rpc("dashboard_summary", { p_business_id: business.id, p_from: monthStart, p_to: today }),
    supabase.from("products").select("id, name, qty_on_hand, reorder_level, unit")
      .eq("business_id", business.id).order("qty_on_hand").limit(50),
  ]);

  if (error) return <p className="card text-red-700">Could not load the dashboard: {error.message}</p>;

  const s = data as Summary;
  const gp = grossProfit(Number(s.sales), Number(s.cost_of_sales));
  const netProfit = gp.profit - Number(s.expenses);
  const low = (lowStock ?? []).filter((p) => Number(p.qty_on_hand) <= Number(p.reorder_level));

  const cards = [
    { label: "Sales this month", value: s.sales },
    { label: "Gross profit", value: gp.profit, note: gp.margin === null ? "No sales yet" : `${gp.margin}% margin` },
    { label: "Expenses this month", value: s.expenses },
    { label: "Profit after expenses", value: netProfit },
    { label: "Money in cash, mobile money and bank", value: s.cash, note: "Estimated from your records" },
    { label: "Customers owe you", value: s.receivables },
    { label: "You owe suppliers", value: s.payables },
    { label: "Stock value (at average cost)", value: s.inventory_value },
  ];

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-slate-600">{monthStart} to {today}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className={`mt-1 text-xl font-bold ${Number(c.value) < 0 ? "text-red-700" : ""}`}>
              {formatMoney(c.value)}
            </p>
            {c.note && <p className="text-xs text-slate-500">{c.note}</p>}
          </div>
        ))}
      </div>

      <section className="card space-y-2">
        <h2 className="font-semibold">What this means</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>
            You sold {formatMoney(s.sales)} of goods that cost you {formatMoney(s.cost_of_sales)},
            so you made {formatMoney(gp.profit)} before expenses.
          </li>
          <li>
            After {formatMoney(s.expenses)} of expenses, the business {netProfit >= 0 ? "made" : "lost"}{" "}
            {formatMoney(Math.abs(netProfit))} this month.
          </li>
          {Number(s.receivables) > 0 && (
            <li>Customers still owe you {formatMoney(s.receivables)}. Follow up before buying more stock on credit.</li>
          )}
          <li>{low.length ? `${low.length} product(s) are at or below their reorder level.` : "No products are low on stock."}</li>
        </ul>
      </section>

      {low.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-semibold">Low stock</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {low.map((p) => (
              <li key={p.id} className="flex justify-between py-2">
                <span>{p.name}</span>
                <span className="font-medium text-amber-700">{Number(p.qty_on_hand)} {p.unit} left</span>
              </li>
            ))}
          </ul>
          <Link href="/stock" className="btn mt-3">Receive stock</Link>
        </section>
      )}
    </>
  );
}
