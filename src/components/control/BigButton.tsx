import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "danger" | "primary" | "ghost";
  active?: boolean;
};

export const BigButton = forwardRef<HTMLButtonElement, Props>(function BigButton(
  { className, variant = "default", active, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      {...props}
      className={cn(
        "select-none rounded-xl border px-5 py-4 text-base font-semibold uppercase tracking-wide transition-all",
        "active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none",
        "border-white/10 bg-white/5 text-white hover:bg-white/10",
        variant === "primary" && "border-emerald-400/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25",
        variant === "danger" && "border-red-400/30 bg-red-500/15 text-red-200 hover:bg-red-500/25",
        variant === "ghost" && "border-transparent bg-transparent hover:bg-white/5",
        active && "ring-2 ring-emerald-400/60",
        className
      )}
    />
  );
});
