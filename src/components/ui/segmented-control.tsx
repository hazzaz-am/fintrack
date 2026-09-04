"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

function SegmentedControl({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroup>) {
  return (
    <ToggleGroup
      spacing={0}
      className={cn("w-full gap-0 rounded-full bg-muted p-1", className)}
      {...props}
    />
  )
}

function SegmentedControlItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupItem>) {
  return (
    <ToggleGroupItem
      className={cn(
        "flex-1 rounded-full! border-0! bg-transparent px-4 text-sm font-medium text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm",
        className
      )}
      {...props}
    />
  )
}

export { SegmentedControl, SegmentedControlItem }
