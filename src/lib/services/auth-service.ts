import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { setSessionCookie, clearSessionCookie, getSessionUserId } from "@/lib/auth/session";
import { CategoryService } from "@/lib/services/category-service";
import type { LoginInput, RegisterInput } from "@/lib/validation/auth";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  defaultCurrency: string;
}

function toPublicUser(user: { id: string; name: string; email: string; defaultCurrency: string }): PublicUser {
  return { id: user.id, name: user.name, email: user.email, defaultCurrency: user.defaultCurrency };
}

export const AuthService = {
  async register(input: RegisterInput): Promise<PublicUser> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError("CONFLICT", "An account with this email already exists.");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
    });
    await CategoryService.seedDefaultsForUser(user.id);

    await setSessionCookie(user.id);
    return toPublicUser(user);
  },

  async login(input: LoginInput): Promise<PublicUser> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    // Always run a hash comparison even when no user exists, so response
    // timing doesn't reveal whether the email is registered.
    const passwordHash = user?.passwordHash ?? "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const valid = await verifyPassword(passwordHash, input.password);

    if (!user || !valid) {
      throw new AppError("VALIDATION_ERROR", "Invalid email or password.");
    }

    await setSessionCookie(user.id);
    return toPublicUser(user);
  },

  async logout(): Promise<void> {
    await clearSessionCookie();
  },

  async getCurrentUser(): Promise<PublicUser | null> {
    const userId = await getSessionUserId();
    if (!userId) return null;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user ? toPublicUser(user) : null;
  },
};
