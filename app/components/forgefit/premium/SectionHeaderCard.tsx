"use client";

import React from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INNER_PADDING } from "../layout/spacing";

export function SectionHeaderCard(props: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  headerClassName?: string;
  titleClassName?: string;
  titleTextClassName?: string;
  iconClassName?: string;
  descriptionClassName?: string;
}) {
  const {
    title,
    description,
    icon,
    children,
    headerClassName,
    titleClassName,
    titleTextClassName,
    iconClassName,
    descriptionClassName,
  } = props;

  return (
    <Card className="rounded-[24px]">
      <CardHeader className={`gap-2 ${INNER_PADDING} pb-2 ${headerClassName || ""}`}>
        <CardTitle
          className={`flex items-center gap-2 ff-kicker text-muted-foreground ${titleClassName || ""}`}
        >
          {icon ? <span className={iconClassName}>{icon}</span> : null}
          <span className={titleTextClassName}>{title}</span>
        </CardTitle>
        {description ? (
          <CardDescription
            className={`ff-body text-foreground/80 ${descriptionClassName || ""}`}
          >
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      {children}
    </Card>
  );
}
