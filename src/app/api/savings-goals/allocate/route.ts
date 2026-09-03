import { NextRequest, NextResponse } from "next/server";
import { SavingsGoalService } from "@/lib/services/savings-goal-service";
import { allocateSchema } from "@/lib/validation/savings-goal";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = allocateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid allocation input.", parsed.error.flatten());
    }

    const allocation = await SavingsGoalService.allocate(userId, parsed.data);
    return NextResponse.json({ allocation }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
