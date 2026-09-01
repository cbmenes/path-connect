import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 min-h-11 px-4",
  {
    variants: {
      variant: {
        primary: "bg-navy text-primary-foreground hover:bg-navy-deep shadow-soft",
        accent: "bg-sage text-accent-foreground hover:bg-sage/90",
        outline: "border border-border bg-paper text-ink hover:bg-secondary",
        ghost: "text-ink hover:bg-secondary",
        danger: "bg-danger text-paper hover:bg-danger/90",
        link: "min-h-0 px-0 text-navy underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11",
        sm: "min-h-9 px-3 text-sm",
        lg: "min-h-12 px-5 text-base",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
