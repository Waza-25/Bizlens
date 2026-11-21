"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { text, type FormState } from "@/lib/forms";

export async function authenticate(_prev: FormState, form: FormData): Promise<FormState> {
  const email = text(form, "email");
  const password = text(form, "password");
  const mode = text(form, "mode"); // which button was pressed

  if (!email || password.length < 8) {
    return { ok: false, message: "Enter your email and a password of at least 8 characters." };
  }

  const supabase = await createClient();

  if (mode === "signup") {
    const origin = (await headers()).get("origin") ?? "";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) return { ok: false, message: error.message };
    if (!data.session) {
      return { ok: true, message: "Account created. Check your email and click the confirmation link." };
    }
    redirect("/setup");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
