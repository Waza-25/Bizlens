"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/business";
import { friendlyError, num, text, type FormState } from "@/lib/forms";

export async function recordExpense(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, business } = await requireBusiness();

  const amount = num(form, "amount");
  if (!(amount > 0)) return { ok: false, message: "Enter an amount above 0." };

  const { error } = await supabase.rpc("record_expense", {
    p_business_id: business.id,
    p_expense_date: text(form, "expense_date") || null,
    p_category: text(form, "category"),
    p_description: text(form, "description"),
    p_amount: amount,
    p_payment_method: text(form, "payment_method"),
    p_request_id: text(form, "request_id"),
  });
  if (error) return { ok: false, message: friendlyError(error.message) };

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: true, message: "Expense saved." };
}
