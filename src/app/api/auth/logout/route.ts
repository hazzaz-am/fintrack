import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth-service";
import { toErrorResponse } from "@/lib/errors";

export async function POST() {
  try {
    await AuthService.logout();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
