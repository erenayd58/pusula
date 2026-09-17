"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Menü bağlantısı: yalnızca aktiflik hesabı istemcidedir. Aktif öğe `aria-current="page"` ve
 * `data-active` taşır; kaplar stilini `activeClassName` ile verir. Bir öğe hem kendi yolunda
 * hem alt yollarında aktiftir (`/student/topics/…`).
 */
export function NavLink({
  href,
  className,
  activeClassName,
  exact = false,
  ...props
}: React.ComponentProps<typeof Link> & {
  href: string;
  activeClassName?: string;
  /** Sadece tam eşleşmede aktif (kök sekmeler için). */
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      data-active={active || undefined}
      className={cn(className, active && activeClassName)}
      {...props}
    />
  );
}
