"use client";

import Link from "next/link";
import { CONTENT_REVISION } from "@/lib/content-events";
import { trackEvent } from "@/lib/tracking";
import type { ReactNode } from "react";

type Props = { href: string; children: ReactNode; className?: string; kind: "source" | "product"; contentId?: string; sourceId?: "ted_fields" | "ral_vergabe" | "ral_wissen" | "excel_errors" | "excel_recalculation" };

export default function ContentLink({ href, children, className, kind, sourceId, contentId = "ausschreibung-gebaeudereinigung-pruefen" }: Props) {
  function trackClick() {
    // Fixed identifiers only; never link text, URL parameters or checklist inputs.
    trackEvent(kind === "source" ? "source_click" : "content_product_click", {
      content_id: contentId, revision: CONTENT_REVISION,
      ...(kind === "source" ? { source_id: sourceId } : {}),
    });
  }

  if (kind === "product") {
    return <Link href={href} className={className} onClick={trackClick}>{children}</Link>;
  }

  return <a href={href} className={className} target="_blank" rel="noopener noreferrer" onClick={trackClick}>{children}</a>;
}
