import { requireBusiness } from "@/lib/business";
import { formatMoney } from "@/lib/calc";
import { ProductForm } from "./product-form";

export default async function ProductsPage() {
  const { supabase, business } = await requireBusiness();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku, unit, qty_on_hand, avg_cost, selling_price, reorder_level")
    .eq("business_id", business.id)
    .order("name");

  return (
    <>
      <h1 className="text-2xl font-bold">Products and stock</h1>
      <ProductForm formKey={crypto.randomUUID()} />
      <section className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>Product</th><th>In stock</th><th>Avg cost</th><th>Price</th><th>Stock value</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(products ?? []).map((p) => {
              const qty = Number(p.qty_on_hand);
              const status = qty <= 0 ? "Out of stock" : qty <= Number(p.reorder_level) ? "Low" : "OK";
              return (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}{p.sku && <span className="block text-xs text-slate-500">{p.sku}</span>}</td>
                  <td>{qty} {p.unit}</td>
                  <td>{formatMoney(p.avg_cost)}</td>
                  <td>{formatMoney(p.selling_price)}</td>
                  <td>{formatMoney(qty * Number(p.avg_cost))}</td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      status === "OK" ? "bg-emerald-50 text-emerald-700"
                      : status === "Low" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!products?.length && (
              <tr><td colSpan={6} className="py-6 text-center text-slate-500">No products yet. Add your first one above.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
