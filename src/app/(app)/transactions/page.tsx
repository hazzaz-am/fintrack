import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAuth } from "@/lib/auth/require-auth";
import { TransactionService } from "@/lib/services/transaction-service";
import { AccountService } from "@/lib/services/account-service";
import { CategoryService } from "@/lib/services/category-service";
import { resolveDateRange, isDateRangePeriod } from "@/lib/date-range";
import { TRANSACTION_TYPES } from "@/lib/validation/transaction";
import { Button } from "@/components/ui/button";
import { RecordTransactionDialog } from "@/components/transactions/record-transaction-dialog";
import { TransactionFilters } from "./transaction-filters";
import { TransactionTable } from "./transaction-table";

export const metadata = { title: "Transactions — FinTrack" };

const PAGE_SIZE = 20;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const userId = await requireAuth();
  const params = await searchParams;

  const search = first(params.search)?.trim() || undefined;
  const accountId = first(params.accountId) || undefined;
  const categoryId = first(params.categoryId) || undefined;
  const typeParam = first(params.type);
  const type =
    typeParam && (TRANSACTION_TYPES as readonly string[]).includes(typeParam)
      ? (typeParam as (typeof TRANSACTION_TYPES)[number])
      : undefined;
  const periodParam = first(params.period) ?? "all";
  const fromParam = first(params.from);
  const toParam = first(params.to);
  const sortParam = first(params.sort) ?? "transactionDate:desc";
  const highlightId = first(params.highlight);
  const page = Math.max(1, Number(first(params.page)) || 1);

  const [sortByRaw, sortDirRaw] = sortParam.split(":");
  const sortBy = sortByRaw === "amount" ? "amount" : "transactionDate";
  const sortDir = sortDirRaw === "asc" ? "asc" : "desc";

  let from: Date | undefined;
  let to: Date | undefined;
  if (periodParam !== "all" && isDateRangePeriod(periodParam)) {
    const range = resolveDateRange(
      periodParam,
      periodParam === "custom"
        ? { from: fromParam ? new Date(fromParam) : undefined, to: toParam ? new Date(toParam) : undefined }
        : undefined
    );
    from = range.from;
    to = range.to;
  }

  const [{ items, total, pageSize }, accounts, categories] = await Promise.all([
    TransactionService.listPaginated(userId, {
      search,
      accountId,
      categoryId,
      type,
      from,
      to,
      sortBy,
      sortDir,
      page,
      pageSize: PAGE_SIZE,
    }),
    AccountService.listWithBalances(userId),
    CategoryService.list(userId),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currency = accounts[0]?.currency ?? "BDT";

  function pageHref(targetPage: number) {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (accountId) qs.set("accountId", accountId);
    if (categoryId) qs.set("categoryId", categoryId);
    if (type) qs.set("type", type);
    if (periodParam !== "all") qs.set("period", periodParam);
    if (fromParam) qs.set("from", fromParam);
    if (toParam) qs.set("to", toParam);
    if (sortParam) qs.set("sort", sortParam);
    qs.set("page", String(targetPage));
    return `/transactions?${qs.toString()}`;
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">Every income, expense, and transfer you&apos;ve recorded.</p>
        </div>
        {accounts.length > 0 && (
          <div className="shrink-0">
            <RecordTransactionDialog
              accounts={accounts}
              categories={categories}
              trigger={<Button />}
              triggerLabel={
                <>
                  <Plus /> Record transaction
                </>
              }
            />
          </div>
        )}
      </div>
      {accounts.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Add an account first — transactions are always recorded against one.
        </p>
      ) : (
        <>
          <TransactionFilters
            accounts={accounts}
            categories={categories}
            values={{
              search,
              accountId,
              categoryId,
              type,
              period: periodParam,
              from: fromParam,
              to: toParam,
              sort: sortParam,
            }}
          />
          <TransactionTable
            transactions={items}
            categories={categories}
            accounts={accounts}
            highlightId={highlightId}
            currency={currency}
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Button variant="outline" size="sm" nativeButton={false} render={<Link href={pageHref(page - 1)} />}>
                    Previous
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                )}
                {page < totalPages ? (
                  <Button variant="outline" size="sm" nativeButton={false} render={<Link href={pageHref(page + 1)} />}>
                    Next
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
