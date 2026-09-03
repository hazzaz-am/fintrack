import { NextRequest, NextResponse } from "next/server";
import { RecurringTransactionService } from "@/lib/services/recurring-transaction-service";
import { updateRecurringTransactionSchema } from "@/lib/validation/recurring-transaction";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

interface RouteParams {
  params: Promise<{ recurringTransactionId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { recurringTransactionId } = await params;
    const body = await request.json();
    const parsed = updateRecurringTransactionSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid recurring transaction input.", parsed.error.flatten());
    }

    const template = await RecurringTransactionService.update(userId, recurringTransactionId, parsed.data);
    return NextResponse.json({ template }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { recurringTransactionId } = await params;
    const template = await RecurringTransactionService.archive(userId, recurringTransactionId);
    return NextResponse.json({ template }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
