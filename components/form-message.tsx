import type { FormState } from "@/lib/forms";

// Green box after a save, red box after an error. aria-live = screen readers announce it.
export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p
      aria-live="polite"
      className={`rounded-lg px-3 py-2 text-sm ${
        state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
      }`}
    >
      {state.message}
    </p>
  );
}
