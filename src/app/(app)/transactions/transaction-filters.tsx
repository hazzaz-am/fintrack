import Link from "next/link";
import { Search } from "lucide-react";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption, NativeSelectOptGroup } from "@/components/ui/native-select";
import type { AccountWithBalance } from "@/lib/services/account-service";

export interface TransactionFilterValues {
  search?: string;
  accountId?: string;
  categoryId?: string;
  type?: string;
  period?: string;
  from?: string;
  to?: string;
  sort?: string;
}

export function TransactionFilters({
  accounts,
  categories,
  values,
}: {
  accounts: AccountWithBalance[];
  categories: Array<{ id: string; name: string; type: string }>;
  values: TransactionFilterValues;
}) {
  const incomeCategories = categories.filter((category) => category.type === "INCOME");
  const expenseCategories = categories.filter((category) => category.type === "EXPENSE");
  const sortValue = values.sort ?? "transactionDate:desc";

  return (
    // Plain GET navigation — every filter/sort/page is URL state, so
    // pagination and re-visiting a link never lose the current filters
    // (transactions-ui spec: pagination without state reset).
    <form method="GET" className="rounded-lg border p-4">
      <FieldGroup className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
        <Field className="col-span-2">
          <FieldLabel htmlFor="search">Search</FieldLabel>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="search" name="search" defaultValue={values.search} placeholder="Description…" className="pl-8" />
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor="type">Type</FieldLabel>
          <NativeSelect id="type" name="type" defaultValue={values.type ?? ""}>
            <NativeSelectOption value="">All types</NativeSelectOption>
            <NativeSelectOption value="INCOME">Income</NativeSelectOption>
            <NativeSelectOption value="EXPENSE">Expense</NativeSelectOption>
            <NativeSelectOption value="TRANSFER">Transfer</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="period">Date range</FieldLabel>
          <NativeSelect id="period" name="period" defaultValue={values.period ?? "all"}>
            <NativeSelectOption value="all">All time</NativeSelectOption>
            <NativeSelectOption value="day">Today</NativeSelectOption>
            <NativeSelectOption value="week">This week</NativeSelectOption>
            <NativeSelectOption value="month">This month</NativeSelectOption>
            <NativeSelectOption value="year">This year</NativeSelectOption>
            <NativeSelectOption value="custom">Custom…</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="accountId">Account</FieldLabel>
          <NativeSelect id="accountId" name="accountId" defaultValue={values.accountId ?? ""}>
            <NativeSelectOption value="">All accounts</NativeSelectOption>
            {accounts.map((account) => (
              <NativeSelectOption key={account.id} value={account.id}>
                {account.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="categoryId">Category</FieldLabel>
          <NativeSelect id="categoryId" name="categoryId" defaultValue={values.categoryId ?? ""}>
            <NativeSelectOption value="">All categories</NativeSelectOption>
            <NativeSelectOptGroup label="Income">
              {incomeCategories.map((category) => (
                <NativeSelectOption key={category.id} value={category.id}>
                  {category.name}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
            <NativeSelectOptGroup label="Expense">
              {expenseCategories.map((category) => (
                <NativeSelectOption key={category.id} value={category.id}>
                  {category.name}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="from">Custom from</FieldLabel>
          <Input id="from" name="from" type="date" defaultValue={values.from} />
        </Field>
        <Field>
          <FieldLabel htmlFor="to">Custom to</FieldLabel>
          <Input id="to" name="to" type="date" defaultValue={values.to} />
        </Field>
        <Field>
          <FieldLabel htmlFor="sort">Sort</FieldLabel>
          <NativeSelect id="sort" name="sort" defaultValue={sortValue}>
            <NativeSelectOption value="transactionDate:desc">Date (newest first)</NativeSelectOption>
            <NativeSelectOption value="transactionDate:asc">Date (oldest first)</NativeSelectOption>
            <NativeSelectOption value="amount:desc">Amount (high to low)</NativeSelectOption>
            <NativeSelectOption value="amount:asc">Amount (low to high)</NativeSelectOption>
          </NativeSelect>
        </Field>
      </FieldGroup>
      <div className="mt-4 flex items-center gap-2">
        <Button type="submit">Apply filters</Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href="/transactions" />}>
          Clear
        </Button>
      </div>
    </form>
  );
}
