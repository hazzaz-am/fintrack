import { NextRequest, NextResponse } from "next/server";
import { InvestmentService } from "@/lib/services/investment-service";
import { contributeInvestmentSchema } from "@/lib/validation/investment";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = contributeInvestmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid contribution input.", parsed.error.flatten());
    }

    const transaction = await InvestmentService.contribute(userId, parsed.data);
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
