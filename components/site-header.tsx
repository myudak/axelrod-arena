"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/play", label: "PLAY" },
  { href: "/battle", label: "BATTLE" },
  { href: "/tournament", label: "TOURNAMENT" },
  { href: "/strategies", label: "STRATEGIES" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand" aria-label="Axelrod Arena home">
          <span className="brand__mark" aria-hidden="true">
            <i>C</i>
            <i>D</i>
          </span>
          <span>
            AXELROD
            <b>ARENA</b>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "is-active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <span className="header-status">
          <i aria-hidden="true" /> CLASSIC MODE
        </span>
      </div>
    </header>
  );
}

