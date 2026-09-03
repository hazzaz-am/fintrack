import { NextRequest, NextResponse } from "next/server";
import { InvestmentService } from "@/lib/services/investment-service";
import { createInvestmentWithContributionSchema } from "@/lib/validation/investment";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET() {
  try {
    const userId = await requireAuth();
    const investments = await InvestmentService.listWithPrincipal(userId);
    return NextResponse.json({ investments }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = createInvestmentWithContributionSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid investment input.", parsed.error.flatten());
    }

    const investment = await InvestmentService.createWithInitialContribution(userId, parsed.data);
    return NextResponse.json({ investment }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
