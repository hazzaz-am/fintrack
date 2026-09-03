import { NextRequest, NextResponse } from "next/server";
import { SavingsGoalService } from "@/lib/services/savings-goal-service";
import { createSavingsGoalSchema } from "@/lib/validation/savings-goal";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET() {
  try {
    const userId = await requireAuth();
    const goals = await SavingsGoalService.list(userId);
    return NextResponse.json({ goals }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = createSavingsGoalSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid savings goal input.", parsed.error.flatten());
    }

    const goal = await SavingsGoalService.create(userId, parsed.data);
    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
