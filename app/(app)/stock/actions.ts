"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/business";
import { friendlyError, parseItems, text, type FormState } from "@/lib/forms";

export async function receiveStock(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, business } = await requireBusiness();

  const items = parseItems(form);
  if (typeof items === "string") return { ok: false, message: items };

  const { error } = await supabase.rpc("receive_stock", {
    p_business_id: business.id,
    p_receipt_date: text(form, "receipt_date") || null,
    p_supplier_name: text(form, "supplier_name"),
    p_reference: text(form, "reference"),
    p_payment_method: text(form, "payment_method"),
    p_items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, unit_cost: i.price })),
    p_request_id: text(form, "request_id"),
  });
  if (error) return { ok: false, message: friendlyError(error.message) };

  revalidatePath("/stock");
  revalidatePath("/dashboard");
  return { ok: true, message: "Stock received. Quantities and average costs updated." };
}
