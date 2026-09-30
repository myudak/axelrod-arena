import { Link, NavLink } from "react-router";
import { MotionToggle, SoundToggle } from "@/components/settings-controls";

const nav = [
  { href: "/play", label: "PLAY" },
  { href: "/battle", label: "BATTLE" },
  { href: "/tournament", label: "TOURNAMENT" },
  { href: "/strategies", label: "STRATEGIES" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand" aria-label="Axelrod Arena home">
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
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) => (isActive ? "is-active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-tools">
          <SoundToggle />
          <MotionToggle />
        </div>
      </div>
    </header>
  );
}
