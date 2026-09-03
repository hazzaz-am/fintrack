import { NextRequest, NextResponse } from "next/server";
import { SavingsGoalService } from "@/lib/services/savings-goal-service";
import { moveAllocationSchema } from "@/lib/validation/savings-goal";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = moveAllocationSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid move-allocation input.", parsed.error.flatten());
    }

    const result = await SavingsGoalService.moveAllocation(userId, parsed.data);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
