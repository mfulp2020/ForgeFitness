import React from "react";
import { cn } from "@/lib/utils";

export function ForgeFitMark({
  className,
  title = "ForgeFit",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("text-primary", className)}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2.5 20.2 7.25v9.5L12 21.5 3.8 16.75v-9.5L12 2.5Z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M12 2.5 20.2 7.25v9.5L12 21.5 3.8 16.75v-9.5L12 2.5Z"
        fill="none"
        stroke="currentColor"
        opacity="0.65"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      <path
        d="M8.6 16.6V7.6h5.1M8.6 12h4.0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <path
        d="M12.6 16.6V9.1h3.9M12.6 12.2h3.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
    </svg>
  );
}
