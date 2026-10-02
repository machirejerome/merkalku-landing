"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/tracking";
import type { ReactNode } from "react";

type Props = { href: string; children: ReactNode; className?: string; kind: "source" | "product"; sourceId?: "ted_fields" | "ral_vergabe" };

export default function ContentLink({ href, children, className, kind, sourceId }: Props) {
  function trackClick() {
    // Fixed identifiers only; never link text, URL parameters or checklist inputs.
    trackEvent(kind === "source" ? "source_click" : "content_product_click", {
      content_id: "ausschreibung-gebaeudereinigung-pruefen", revision: 1,
      ...(kind === "source" ? { source_id: sourceId } : {}),
    });
  }

  if (kind === "product") {
    return <Link href={href} className={className} onClick={trackClick}>{children}</Link>;
  }

  return <a href={href} className={className} target="_blank" rel="noopener noreferrer" onClick={trackClick}>{children}</a>;
}
