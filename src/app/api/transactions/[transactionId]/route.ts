import { NextRequest, NextResponse } from "next/server";
import { TransactionService } from "@/lib/services/transaction-service";
import { updateTransactionSchema } from "@/lib/validation/transaction";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

interface RouteParams {
  params: Promise<{ transactionId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { transactionId } = await params;
    const body = await request.json();
    const parsed = updateTransactionSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid transaction input.", parsed.error.flatten());
    }

    const transaction = await TransactionService.update(userId, transactionId, parsed.data);
    return NextResponse.json({ transaction }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { transactionId } = await params;
    await TransactionService.delete(userId, transactionId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
