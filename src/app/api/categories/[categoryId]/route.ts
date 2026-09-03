import { NextRequest, NextResponse } from "next/server";
import { CategoryService } from "@/lib/services/category-service";
import { updateCategorySchema } from "@/lib/validation/category";
import { toErrorResponse, AppError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ categoryId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { categoryId } = await params;
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || category.userId !== userId) {
      throw new AppError("NOT_FOUND", "Category not found.");
    }
    const usageCount = await CategoryService.getUsageCount(userId, categoryId);
    return NextResponse.json({ category, usageCount }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { categoryId } = await params;
    const body = await request.json();
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid category input.", parsed.error.flatten());
    }

    const category = await CategoryService.update(userId, categoryId, parsed.data);
    return NextResponse.json({ category }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { categoryId } = await params;
    await CategoryService.delete(userId, categoryId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
