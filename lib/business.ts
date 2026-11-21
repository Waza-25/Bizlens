import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Business = { id: string; name: string; currency: string };

// Returns the signed-in user and their business. Sends them to /login
// or /setup if either is missing. cache() = runs once per page request.
export const requireBusiness = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("business_users")
    .select("role, businesses(id, name, currency)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const business = membership?.businesses as unknown as Business | null;
  if (!business) redirect("/setup");

  return { supabase, user, business, role: membership!.role as string };
});
