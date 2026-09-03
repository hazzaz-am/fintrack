import { NextRequest, NextResponse } from "next/server";
import { InvestmentService } from "@/lib/services/investment-service";
import { recordMaturityOrWithdrawalSchema } from "@/lib/validation/investment";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = recordMaturityOrWithdrawalSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid maturity/withdrawal input.", parsed.error.flatten());
    }

    const result = await InvestmentService.recordMaturityOrWithdrawal(userId, parsed.data);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
