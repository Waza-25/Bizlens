import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-brand">BizLens</h1>
        <p className="mt-1 text-slate-600">Know what you sold, spent, owe and are owed.</p>
      </div>
      <LoginForm />
    </main>
  );
}
