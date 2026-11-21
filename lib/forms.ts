// Shared types and helpers for forms that use Server Actions.

export type FormState = { ok: boolean; message: string };

export const initialFormState: FormState = { ok: false, message: "" };

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "bank", label: "Bank / card" },
  { value: "credit", label: "On credit (pay later)" },
] as const;

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Transport",
  "Wages",
  "Marketing",
  "Other",
] as const;

export function text(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

export function num(form: FormData, name: string): number {
  const value = Number(text(form, name) || 0);
  return Number.isFinite(value) ? value : NaN;
}

/** Turns a database error into a short message for the screen. */
export function friendlyError(message: string | undefined): string {
  if (!message) return "Something went wrong. Please try again.";
  if (message.includes("duplicate key") && message.includes("name"))
    return "A product with that name already exists.";
  return message;
}

export type ItemInput = { product_id: string; quantity: number; price: number };

/** Reads the hidden "items" JSON from ItemLines and checks every line. */
export function parseItems(form: FormData): ItemInput[] | string {
  let items: ItemInput[];
  try {
    items = JSON.parse(text(form, "items") || "[]");
  } catch {
    return "Could not read the items. Please try again.";
  }
  if (!items.length) return "Add at least one item.";
  for (const item of items) {
    if (!item.product_id) return "Choose a product on every line.";
    if (!(item.quantity > 0)) return "Every quantity must be more than 0.";
    if (!(item.price >= 0)) return "Every price must be 0 or more.";
  }
  return items;
}
