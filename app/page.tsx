import { redirect } from "next/navigation";

// The home address simply opens the dashboard (proxy.ts sends
// signed-out visitors to /login first).
export default function Home() {
  redirect("/dashboard");
}
