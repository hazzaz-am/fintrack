import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth-service";
import { changePasswordSchema } from "@/lib/validation/auth";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid password input.", parsed.error.flatten());
    }

    await AuthService.changePassword(userId, parsed.data);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
