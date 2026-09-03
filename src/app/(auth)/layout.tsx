import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSessionUserId();
  if (userId) {
    redirect("/accounts");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-heading text-lg font-semibold tracking-tight">FinTrack</span>
        </div>
        {children}
      </div>
    </div>
  );
}
