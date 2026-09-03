import { NextRequest, NextResponse } from "next/server";
import { SavingsGoalService } from "@/lib/services/savings-goal-service";
import { updateSavingsGoalSchema } from "@/lib/validation/savings-goal";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

interface RouteParams {
  params: Promise<{ goalId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { goalId } = await params;
    const body = await request.json();
    const parsed = updateSavingsGoalSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid savings goal input.", parsed.error.flatten());
    }

    const goal = await SavingsGoalService.update(userId, goalId, parsed.data);
    return NextResponse.json({ goal }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
