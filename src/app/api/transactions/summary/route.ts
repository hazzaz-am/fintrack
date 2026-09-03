import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TransactionService } from "@/lib/services/transaction-service";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

const summaryQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = summaryQuerySchema.safeParse(searchParams);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "A valid `from` and `to` date is required.", parsed.error.flatten());
    }

    const summary = await TransactionService.getSummary(userId, parsed.data);
    return NextResponse.json({ summary }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
