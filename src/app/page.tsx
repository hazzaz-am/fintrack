import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";

export default async function Home() {
  const userId = await getSessionUserId();
  redirect(userId ? "/accounts" : "/login");
}
