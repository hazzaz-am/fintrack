import { NextResponse } from "next/server";
import { AccountService } from "@/lib/services/account-service";
import { toErrorResponse } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

interface RouteParams {
  params: Promise<{ accountId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { accountId } = await params;
    const account = await AccountService.archive(userId, accountId);
    return NextResponse.json({ account }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
