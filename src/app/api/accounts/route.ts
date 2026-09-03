import { NextRequest, NextResponse } from "next/server";
import { AccountService } from "@/lib/services/account-service";
import { createAccountSchema } from "@/lib/validation/account";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET() {
  try {
    const userId = await requireAuth();
    const accounts = await AccountService.listWithBalances(userId);
    return NextResponse.json({ accounts }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = createAccountSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid account input.", parsed.error.flatten());
    }

    const account = await AccountService.create(userId, parsed.data);
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
