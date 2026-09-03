"use client";

import { Pencil, Plus, Tags } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { CategoryFormDialog, type EditableCategory } from "./category-form-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";

export interface CategoryRow {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string | null;
  parentCategoryId: string | null;
}

function CategoryTypeTable({ title, description, type, categories }: {
  title: string;
  description: string;
  type: "INCOME" | "EXPENSE";
  categories: CategoryRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <CategoryFormDialog
            defaultType={type}
            trigger={<Button variant="outline" size="sm" />}
            triggerLabel={
              <>
                <Plus /> Add
              </>
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No {title.toLowerCase()} yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-0">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <CategoryFormDialog
                        category={{ id: category.id, name: category.name, type: category.type, icon: category.icon } satisfies EditableCategory}
                        trigger={<Button variant="ghost" size="icon-sm" aria-label={`Rename ${category.name}`} />}
                        triggerLabel={<Pencil />}
                      />
                      <DeleteCategoryDialog categoryId={category.id} categoryName={category.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function CategoriesSection({ categories }: { categories: CategoryRow[] }) {
  const income = categories.filter((category) => category.type === "INCOME");
  const expense = categories.filter((category) => category.type === "EXPENSE");

  if (categories.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Tags />
          </EmptyMedia>
          <EmptyTitle>No categories yet</EmptyTitle>
          <EmptyDescription>Add categories to organize your income and expenses.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <CategoryFormDialog
            trigger={<Button />}
            triggerLabel={
              <>
                <Plus /> Add your first category
              </>
            }
          />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <CategoryTypeTable title="Income categories" description="Sources you record income under." type="INCOME" categories={income} />
      <CategoryTypeTable title="Expense categories" description="Categories you record expenses under." type="EXPENSE" categories={expense} />
    </div>
  );
}
