import { NextRequest, NextResponse } from "next/server";
import { TransactionService } from "@/lib/services/transaction-service";
import { recordTransferSchema } from "@/lib/validation/transaction";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = recordTransferSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid transfer input.", parsed.error.flatten());
    }

    const transaction = await TransactionService.recordTransfer(userId, parsed.data);
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
