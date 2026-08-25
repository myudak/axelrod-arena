import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/8bit/badge";
import { Button } from "@/components/ui/8bit/button";
import { Card } from "@/components/ui/8bit/card";

export function PixelButton({
  children,
  className = "",
  tone = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "cooperate" | "defect" | "quiet";
}) {
  return (
    <Button
      variant={tone === "quiet" ? "secondary" : tone === "defect" ? "destructive" : "default"}
      className={`arena-button arena-button--${tone} ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
}

export function PixelLink({
  children,
  href,
  tone = "primary",
}: {
  children: ReactNode;
  href: string;
  tone?: "primary" | "quiet";
}) {
  return (
    <Button
      asChild
      variant={tone === "quiet" ? "secondary" : "default"}
      className={`arena-button arena-button--${tone} arena-link-button`}
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}

export function PixelPanel({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <Card font="normal" className="pixel-card-shell" {...props}>
      <div className={`pixel-panel ${className}`}>{children}</div>
    </Card>
  );
}

export function PixelBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "cooperate" | "defect" | "gold";
}) {
  return (
    <Badge
      variant={tone === "defect" ? "destructive" : tone === "neutral" ? "secondary" : "default"}
      className={`arena-badge arena-badge--${tone}`}
    >
      {children}
    </Badge>
  );
}

export function ScreenTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="screen-title">
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
