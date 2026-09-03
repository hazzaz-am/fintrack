import { NextRequest, NextResponse } from "next/server";
import { TransactionService } from "@/lib/services/transaction-service";
import { dateRangeFilterSchema, recordIncomeOrExpenseSchema } from "@/lib/validation/transaction";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = dateRangeFilterSchema.safeParse(searchParams);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid filter parameters.", parsed.error.flatten());
    }

    const transactions = await TransactionService.list(userId, parsed.data);
    return NextResponse.json({ transactions }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// Records an income or expense transaction. `type` in the request body selects which;
// transfers are handled by the dedicated /api/transactions/transfer endpoint since
// they have a materially different shape (source/destination, no category).
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = recordIncomeOrExpenseSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid transaction input.", parsed.error.flatten());
    }

    const type = body.type === "EXPENSE" ? "EXPENSE" : "INCOME";
    const transaction =
      type === "EXPENSE"
        ? await TransactionService.recordExpense(userId, parsed.data)
        : await TransactionService.recordIncome(userId, parsed.data);

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
