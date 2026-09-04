import * as React from "react"

import { cn } from "@/lib/utils"

function ListRow({
  className,
  icon,
  iconClassName,
  title,
  subtitle,
  trailing,
  progress,
  ...props
}: React.ComponentProps<"div"> & {
  icon?: React.ReactNode
  iconClassName?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  trailing?: React.ReactNode
  progress?: React.ReactNode
}) {
  return (
    <div
      data-slot="list-row"
      className={cn("flex flex-col gap-2 py-2", className)}
      {...props}
    >
      <div className="flex items-center gap-3">
        {icon ? (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground [&_svg]:size-4",
              iconClassName
            )}
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{title}</div>
          {subtitle ? (
            <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
        {trailing ? (
          <div className="shrink-0 text-sm font-medium text-foreground">{trailing}</div>
        ) : null}
      </div>
      {progress ? <div className="pl-13">{progress}</div> : null}
    </div>
  )
}

export { ListRow }
