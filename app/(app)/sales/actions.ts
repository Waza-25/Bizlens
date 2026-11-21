"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/business";
import { friendlyError, parseItems, text, type FormState } from "@/lib/forms";

export async function recordSale(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, business } = await requireBusiness();

  const items = parseItems(form);
  if (typeof items === "string") return { ok: false, message: items };

  const { error } = await supabase.rpc("record_sale", {
    p_business_id: business.id,
    p_sale_date: text(form, "sale_date") || null,
    p_customer_name: text(form, "customer_name"),
    p_payment_method: text(form, "payment_method"),
    p_items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.price })),
    p_request_id: text(form, "request_id"),
  });
  if (error) return { ok: false, message: friendlyError(error.message) };

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { ok: true, message: "Sale saved and stock updated." };
}
