"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, text, type FormState } from "@/lib/forms";

export async function createBusiness(_prev: FormState, form: FormData): Promise<FormState> {
  const name = text(form, "name");
  if (!name) return { ok: false, message: "Enter your business name." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_business", { p_name: name });
  if (error) return { ok: false, message: friendlyError(error.message) };

  redirect("/dashboard");
}
