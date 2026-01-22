import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const baseGlass =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"

const buttonVariants = cva(baseGlass, {
  variants: {
    variant: {
      default:
        "border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.08)] text-foreground shadow-[0_15px_35px_rgba(0,0,0,0.4)] hover:bg-[rgba(255,255,255,0.12)] active:scale-95 active:shadow-[0_12px_30px_rgba(0,0,0,0.5)]",
      destructive:
        "bg-destructive text-white shadow-[var(--shadow-card)] hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
      outline:
        "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-foreground backdrop-blur-[18px] shadow-[0_12px_30px_rgba(0,0,0,0.4)] hover:bg-[rgba(255,255,255,0.1)]",
      secondary:
        "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] text-muted-foreground shadow-[0_10px_24px_rgba(0,0,0,0.35)] hover:bg-[rgba(255,255,255,0.1)] hover:text-foreground",
      ghost:
        "rounded-full bg-transparent text-foreground hover:bg-[rgba(255,255,255,0.08)]",
      link: "text-primary underline-offset-4 hover:underline",
      forge:
        "rounded-full border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,#ff2a2a_0%,#ff1b2d_55%,#d60f2d_100%)] text-white shadow-[0_18px_50px_rgba(255,30,58,0.25)] hover:-translate-y-0.5 active:scale-[0.98] active:shadow-[0_12px_30px_rgba(255,30,58,0.2)] before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_30%)] before:opacity-100 before:pointer-events-none after:absolute after:inset-[-6px] after:rounded-[inherit] after:bg-[radial-gradient(60%_60%_at_50%_50%,rgba(255,30,58,0.2),transparent_70%)] after:opacity-60 after:pointer-events-none",
      forgeSmall:
        "rounded-full border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,#ff2a2a_0%,#ff1b2d_55%,#d60f2d_100%)] text-white shadow-[0_14px_36px_rgba(255,30,58,0.22)] hover:-translate-y-0.5 active:scale-[0.98] active:shadow-[0_10px_26px_rgba(255,30,58,0.18)] before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_35%)] before:opacity-100 before:pointer-events-none",
    },
    size: {
      default: "h-11 px-5",
      sm: "h-9 px-3 text-xs",
      lg: "h-12 px-6 text-base",
      icon: "h-10 w-10 p-0",
      "icon-sm": "h-9 w-9 p-0",
      "icon-lg": "h-12 w-12 p-0",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
