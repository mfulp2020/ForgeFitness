import React from "react";
import { CARD_GAP, INNER_PADDING, SECTION_GAP } from "./spacing";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={SECTION_GAP}>
      {title ? (
        <div className={`rounded-[var(--radius-card)] border border-[var(--border)] bg-[rgba(255,255,255,0.04)] ${INNER_PADDING} shadow-[var(--shadow-elev-2)]`}>
          <div className="ff-kicker text-muted-foreground">{title}</div>
          {subtitle ? (
            <div className="mt-1 ff-body-sm text-foreground/80">{subtitle}</div>
          ) : null}
        </div>
      ) : null}

      <div className={CARD_GAP}>{children}</div>
    </div>
  );
}
