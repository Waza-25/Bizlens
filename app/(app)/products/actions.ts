"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/business";
import { friendlyError, num, text, type FormState } from "@/lib/forms";

export async function addProduct(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, business } = await requireBusiness();

  const name = text(form, "name");
  const values = {
    price: num(form, "selling_price"),
    reorder: num(form, "reorder_level"),
    qty: num(form, "opening_qty"),
    cost: num(form, "opening_cost"),
  };
  if (!name) return { ok: false, message: "Enter a product name." };
  if (Object.values(values).some((v) => Number.isNaN(v) || v < 0)) {
    return { ok: false, message: "Numbers must be 0 or more." };
  }
  if (values.qty > 0 && values.cost <= 0) {
    return { ok: false, message: "Enter the cost of the opening stock." };
  }

  const { error } = await supabase.rpc("add_product", {
    p_business_id: business.id,
    p_name: name,
    p_sku: text(form, "sku"),
    p_unit: text(form, "unit"),
    p_selling_price: values.price,
    p_reorder_level: values.reorder,
    p_opening_qty: values.qty,
    p_opening_cost: values.cost,
  });
  if (error) return { ok: false, message: friendlyError(error.message) };

  revalidatePath("/products");
  return { ok: true, message: `${name} added.` };
}
