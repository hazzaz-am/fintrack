import { requireAuth } from "@/lib/auth/require-auth";
import { AuthService } from "@/lib/services/auth-service";
import { CategoryService } from "@/lib/services/category-service";
import { ProfileSection } from "./profile-section";
import { CategoriesSection } from "./categories-section";

export const metadata = { title: "Settings — FinTrack" };

export default async function SettingsPage() {
  const userId = await requireAuth();
  const [user, categories] = await Promise.all([
    AuthService.getCurrentUser(),
    CategoryService.list(userId),
  ]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and the categories you record transactions under.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Profile</h2>
        <ProfileSection user={user} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Categories</h2>
        <CategoriesSection categories={categories} />
      </section>
    </div>
  );
}
