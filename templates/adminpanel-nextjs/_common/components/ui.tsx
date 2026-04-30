"use client";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as React from "react";

export function cn(...inputs: (string | false | null | undefined)[]) {
  return twMerge(clsx(inputs));
}

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function Button({ className, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md bg-brand text-brand-fg px-4 py-2 text-sm font-medium",
          "hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition",
          className
        )}
        {...props}
      />
    );
  }
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-md border px-3 py-2 text-sm bg-transparent",
          "focus:outline-none focus:ring-2 focus:ring-brand",
          className
        )}
        {...props}
      />
    );
  }
);
