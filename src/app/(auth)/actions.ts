"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthService } from "@/lib/services/auth-service";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { AppError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/auth/rate-limit";

export interface AuthActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

async function requestIp(): Promise<string> {
  const headerList = await headers();
  return headerList.get("x-forwarded-for") ?? "unknown";
}

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  try {
    enforceRateLimit(`register:${await requestIp()}`);

    const parsed = registerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    await AuthService.register(parsed.data);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect("/dashboard");
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  try {
    enforceRateLimit(`login:${await requestIp()}`);

    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    await AuthService.login(parsed.data);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect("/dashboard");
}
