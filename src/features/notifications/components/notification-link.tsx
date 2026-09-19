"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { markRead } from "../server/actions";

/** Satır bağlantısı: okunmamışsa tıklamada okundu işaretler (beklemez), sonra hedefe gider. */
export function NotificationLink({
  id,
  href,
  unread,
  className,
  children,
}: {
  id: string;
  href: string;
  unread: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (unread) void markRead({ id });
      }}
    >
      {children}
    </Link>
  );
}
