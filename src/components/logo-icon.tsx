"use client";

import { cn } from "@/lib/utils";

export function LogoIcon({
  className,
  ...props
}: React.HTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src="/logo.svg"
      alt="Logo Polaris"
      className={cn("h-8 w-8", className)}
      {...props}
    />
  );
}
