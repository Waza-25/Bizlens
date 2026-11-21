"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Overview", icon: "▦" },
  { href: "/sales", label: "Sales", icon: "＋" },
  { href: "/stock", label: "Stock in", icon: "⇩" },
  { href: "/expenses", label: "Expenses", icon: "−" },
  { href: "/products", label: "Products", icon: "☰" },
];

// Bottom bar on phones, sidebar on bigger screens (mobile-first).
export function Nav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white
                    md:static md:w-52 md:border-t-0 md:border-r md:bg-transparent">
      <ul className="grid grid-cols-5 md:grid-cols-1 md:gap-1 md:p-3">
        {LINKS.map((l) => {
          const active = path.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs md:flex-row md:gap-3
                            md:rounded-lg md:px-3 md:text-sm ${
                  active ? "font-semibold text-brand md:bg-teal-50" : "text-slate-600"
                }`}
              >
                <span aria-hidden className="text-lg leading-none">{l.icon}</span>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
