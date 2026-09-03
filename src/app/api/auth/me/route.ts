import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth-service";
import { toErrorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const user = await AuthService.getCurrentUser();
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
