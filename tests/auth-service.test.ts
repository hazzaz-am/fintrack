import { describe, expect, it } from "vitest";
import { AuthService } from "@/lib/services/auth-service";
import { AppError } from "@/lib/errors";
import { createTestUser } from "./fixtures";

describe("AuthService — updateProfile", () => {
  it("updates name and email", async () => {
    const user = await createTestUser();

    const updated = await AuthService.updateProfile(user.id, {
      name: "New Name",
      email: "new-email@example.com",
    });

    expect(updated.name).toBe("New Name");
    expect(updated.email).toBe("new-email@example.com");
  });

  it("rejects an email that already belongs to a different user", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();

    await expect(
      AuthService.updateProfile(userB.id, { email: userA.email })
    ).rejects.toThrow(AppError);
  });

  it("allows a user to keep their own current email unchanged", async () => {
    const user = await createTestUser();

    const updated = await AuthService.updateProfile(user.id, { email: user.email, name: "Same Email" });
    expect(updated.email).toBe(user.email);
  });
});

describe("AuthService — changePassword", () => {
  it("changes the password when the current password is correct", async () => {
    const { hashPassword, verifyPassword } = await import("@/lib/auth/password");
    const currentPassword = "correct-horse-battery";
    const passwordHash = await hashPassword(currentPassword);

    const { prisma } = await import("@/lib/db");
    const user = await prisma.user.create({
      data: { name: "Pw User", email: "pw-user@example.com", passwordHash },
    });

    await AuthService.changePassword(user.id, {
      currentPassword,
      newPassword: "brand-new-password",
    });

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword(updated.passwordHash, "brand-new-password")).toBe(true);
    expect(await verifyPassword(updated.passwordHash, currentPassword)).toBe(false);
  });

  it("rejects an incorrect current password and leaves the hash unchanged", async () => {
    const { hashPassword } = await import("@/lib/auth/password");
    const passwordHash = await hashPassword("correct-horse-battery");

    const { prisma } = await import("@/lib/db");
    const user = await prisma.user.create({
      data: { name: "Pw User 2", email: "pw-user-2@example.com", passwordHash },
    });

    await expect(
      AuthService.changePassword(user.id, { currentPassword: "wrong-password", newPassword: "brand-new-password" })
    ).rejects.toThrow(AppError);

    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.passwordHash).toBe(passwordHash);
  });
});
