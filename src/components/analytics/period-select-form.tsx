import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

// Shared by Income, Expenses, and Reports (design.md D16) — plain GET
// navigation, no client state, so the selected period is always the URL.
export function PeriodSelectForm({ period, from, to }: { period: string; from?: string; to?: string }) {
  return (
    <form method="GET" className="flex flex-wrap items-end gap-3">
      <Field className="w-auto">
        <FieldLabel htmlFor="period">Period</FieldLabel>
        <NativeSelect id="period" name="period" defaultValue={period}>
          <NativeSelectOption value="week">This week</NativeSelectOption>
          <NativeSelectOption value="month">This month</NativeSelectOption>
          <NativeSelectOption value="year">This year</NativeSelectOption>
          <NativeSelectOption value="custom">Custom…</NativeSelectOption>
        </NativeSelect>
      </Field>
      <Field className="w-auto">
        <FieldLabel htmlFor="from">From</FieldLabel>
        <Input id="from" name="from" type="date" defaultValue={from} className="w-auto" />
      </Field>
      <Field className="w-auto">
        <FieldLabel htmlFor="to">To</FieldLabel>
        <Input id="to" name="to" type="date" defaultValue={to} className="w-auto" />
      </Field>
      <Button type="submit" variant="outline">
        Apply
      </Button>
    </form>
  );
}
