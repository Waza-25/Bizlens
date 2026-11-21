import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already set up? Go straight to the dashboard.
  const { count } = await supabase
    .from("business_users")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (count) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-bold">Set up your business</h1>
        <p className="mt-1 text-slate-600">
          We will create your business and a simple chart of accounts for it.
        </p>
      </div>
      <SetupForm />
    </main>
  );
}
