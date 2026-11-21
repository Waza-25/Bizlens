import { requireBusiness } from "@/lib/business";
import { signOut } from "@/app/login/actions";
import { Nav } from "@/components/nav";

// Wraps every signed-in page: header + navigation.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { business, user } = await requireBusiness();

  return (
    <div className="min-h-screen pb-20 md:flex md:pb-0">
      <Nav />
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-lg font-bold text-brand">BizLens</p>
            <p className="text-sm text-slate-600">{business.name}</p>
          </div>
          <form action={signOut} className="text-right">
            <p className="hidden text-xs text-slate-500 sm:block">{user.email}</p>
            <button className="text-sm font-medium text-slate-600 underline">Sign out</button>
          </form>
        </header>
        <main className="mx-auto max-w-4xl space-y-6 p-4">{children}</main>
      </div>
    </div>
  );
}
