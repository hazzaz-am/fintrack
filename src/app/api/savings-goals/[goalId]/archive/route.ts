import { NextResponse } from "next/server";
import { SavingsGoalService } from "@/lib/services/savings-goal-service";
import { toErrorResponse } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

interface RouteParams {
  params: Promise<{ goalId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { goalId } = await params;
    const goal = await SavingsGoalService.archive(userId, goalId);
    return NextResponse.json({ goal }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
