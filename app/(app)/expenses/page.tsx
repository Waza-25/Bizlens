import { requireBusiness } from "@/lib/business";
import { formatMoney, todayInZambia } from "@/lib/calc";
import { ExpenseForm } from "./expense-form";

export default async function ExpensesPage() {
  const { supabase, business } = await requireBusiness();
  const { data: expenses } = await supabase
    .from("expenses").select("id, expense_date, category, description, payment_method, amount")
    .eq("business_id", business.id).order("created_at", { ascending: false }).limit(20);

  return (
    <>
      <h1 className="text-2xl font-bold">Expenses</h1>
      <ExpenseForm requestId={crypto.randomUUID()} today={todayInZambia()} />
      <section className="card overflow-x-auto">
        <h2 className="mb-2 font-semibold">Recent expenses</h2>
        <table className="table">
          <thead><tr><th>Date</th><th>Category</th><th>Details</th><th>Amount</th></tr></thead>
          <tbody>
            {(expenses ?? []).map((e) => (
              <tr key={e.id}>
                <td>{e.expense_date}</td><td>{e.category}</td>
                <td>{e.description ?? "-"}{e.payment_method === "credit" && " (unpaid)"}</td>
                <td>{formatMoney(e.amount)}</td>
              </tr>
            ))}
            {!expenses?.length && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No expenses yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
