import { NextRequest, NextResponse } from "next/server";
import { CategoryService } from "@/lib/services/category-service";
import { createCategorySchema } from "@/lib/validation/category";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET() {
  try {
    const userId = await requireAuth();
    const categories = await CategoryService.list(userId);
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid category input.", parsed.error.flatten());
    }

    const category = await CategoryService.create(userId, parsed.data);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
