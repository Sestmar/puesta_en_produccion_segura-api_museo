import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const inputClasses =
  "w-full rounded-control border border-ink-600 bg-ink-900 px-3.5 text-sm text-bone-50 placeholder:text-mute-500 transition-colors focus:border-gold-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(inputClasses, "h-11", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 4, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(inputClasses, "min-h-24 py-2.5 leading-relaxed", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";
