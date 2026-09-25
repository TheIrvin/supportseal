import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-0.5 text-[0.8125rem] font-medium leading-5 whitespace-nowrap",
  {
    variants: {
      color: {
        primary: "",
        secondary: "",
        success: "",
        danger: "",
        warning: "",
        info: "",
        dark: "",
      },
      variant: {
        solid: "text-white",
        light: "",
      },
      pill: {
        true: "rounded-full",
        false: "",
      },
    },
    compoundVariants: [
      { variant: "solid", color: "primary", class: "bg-primary" },
      { variant: "solid", color: "secondary", class: "bg-secondary" },
      { variant: "solid", color: "success", class: "bg-success" },
      { variant: "solid", color: "danger", class: "bg-danger" },
      { variant: "solid", color: "warning", class: "bg-warning" },
      { variant: "solid", color: "info", class: "bg-info" },
      { variant: "solid", color: "dark", class: "bg-dark" },
      { variant: "light", color: "primary", class: "bg-primary-label text-primary" },
      { variant: "light", color: "secondary", class: "bg-secondary-label text-body" },
      { variant: "light", color: "success", class: "bg-success-label text-success" },
      { variant: "light", color: "danger", class: "bg-danger-label text-danger" },
      { variant: "light", color: "warning", class: "bg-warning-label text-warning" },
      { variant: "light", color: "info", class: "bg-info-label text-info" },
      { variant: "light", color: "dark", class: "bg-dark-label text-heading" },
    ],
    defaultVariants: {
      color: "primary",
      variant: "light",
      pill: true,
    },
  },
);

export type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, color, variant, pill, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ color, variant, pill, className }))} {...props} />;
}
