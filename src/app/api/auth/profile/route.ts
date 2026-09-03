import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth-service";
import { updateProfileSchema } from "@/lib/validation/auth";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid profile input.", parsed.error.flatten());
    }

    const user = await AuthService.updateProfile(userId, parsed.data);
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
