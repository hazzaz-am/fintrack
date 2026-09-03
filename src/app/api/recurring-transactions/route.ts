import { NextRequest, NextResponse } from "next/server";
import { RecurringTransactionService } from "@/lib/services/recurring-transaction-service";
import { createRecurringTransactionSchema } from "@/lib/validation/recurring-transaction";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET() {
  try {
    const userId = await requireAuth();
    const templates = await RecurringTransactionService.list(userId);
    return NextResponse.json({ templates }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = createRecurringTransactionSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid recurring transaction input.", parsed.error.flatten());
    }

    const template = await RecurringTransactionService.create(userId, parsed.data);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
