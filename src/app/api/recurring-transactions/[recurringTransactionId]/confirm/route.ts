import { NextRequest, NextResponse } from "next/server";
import { RecurringTransactionService } from "@/lib/services/recurring-transaction-service";
import { confirmRecurringTransactionSchema } from "@/lib/validation/recurring-transaction";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

interface RouteParams {
  params: Promise<{ recurringTransactionId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { recurringTransactionId } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = confirmRecurringTransactionSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid confirmation input.", parsed.error.flatten());
    }

    const transaction = await RecurringTransactionService.confirm(userId, recurringTransactionId, parsed.data);
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
