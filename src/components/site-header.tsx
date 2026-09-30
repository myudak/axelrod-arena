import { Link, NavLink } from "react-router";
import { MotionToggle, SoundToggle } from "@/components/settings-controls";
import { levelInfo, useProgress } from "@/lib/progress";

const nav = [
  { href: "/play", label: "PLAY" },
  { href: "/campaign", label: "CAMPAIGN" },
  { href: "/battle", label: "BATTLE" },
  { href: "/tournament", label: "TOURNAMENT" },
  { href: "/strategies", label: "STRATEGIES" },
];

function LevelChip() {
  const { xp } = useProgress();
  const level = levelInfo(xp);
  return (
    <Link to="/profile" className="level-chip" aria-label={`Level ${level.level} ${level.title}. Open profile`}>
      <b>LV{level.level}</b>
      <span className="level-chip__bar" aria-hidden="true">
        <i style={{ width: `${level.progress * 100}%` }} />
      </span>
    </Link>
  );
}

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
          <LevelChip />
          <SoundToggle />
          <MotionToggle />
        </div>
      </div>
    </header>
  );
}
