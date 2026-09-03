import { NextResponse } from "next/server";
import { InvestmentService } from "@/lib/services/investment-service";
import { toErrorResponse } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET() {
  try {
    const userId = await requireAuth();
    const investments = await InvestmentService.getUpcomingMaturities(userId);
    return NextResponse.json({ investments }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
