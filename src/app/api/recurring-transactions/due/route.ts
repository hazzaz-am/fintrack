import { NextResponse } from "next/server";
import { RecurringTransactionService } from "@/lib/services/recurring-transaction-service";
import { toErrorResponse } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET() {
  try {
    const userId = await requireAuth();
    const templates = await RecurringTransactionService.getDueTemplates(userId);
    return NextResponse.json({ templates }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
