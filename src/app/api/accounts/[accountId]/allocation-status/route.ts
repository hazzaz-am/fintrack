import { NextResponse } from "next/server";
import { SavingsGoalService } from "@/lib/services/savings-goal-service";
import { toErrorResponse } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

interface RouteParams {
  params: Promise<{ accountId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { accountId } = await params;
    const status = await SavingsGoalService.getAccountAllocationStatus(userId, accountId);
    return NextResponse.json({ status }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
