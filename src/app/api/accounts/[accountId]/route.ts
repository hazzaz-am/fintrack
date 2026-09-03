import { NextRequest, NextResponse } from "next/server";
import { AccountService } from "@/lib/services/account-service";
import { updateAccountSchema } from "@/lib/validation/account";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

interface RouteParams {
  params: Promise<{ accountId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { accountId } = await params;
    const body = await request.json();
    const parsed = updateAccountSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid account input.", parsed.error.flatten());
    }

    const account = await AccountService.update(userId, accountId, parsed.data);
    return NextResponse.json({ account }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
