import { NextRequest, NextResponse } from "next/server";
import { InvestmentService } from "@/lib/services/investment-service";
import { updateInvestmentSchema } from "@/lib/validation/investment";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

interface RouteParams {
  params: Promise<{ investmentId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { investmentId } = await params;
    const body = await request.json();
    const parsed = updateInvestmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid investment input.", parsed.error.flatten());
    }

    const investment = await InvestmentService.update(userId, investmentId, parsed.data);
    return NextResponse.json({ investment }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
