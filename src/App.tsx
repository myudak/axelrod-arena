import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import { SiteHeader } from "@/components/site-header";
import BattlePage from "@/routes/battle";
import Home from "@/routes/home";
import NotFound from "@/routes/not-found";
import PlayPage from "@/routes/play";
import StrategiesPage from "@/routes/strategies";
import TournamentPage from "@/routes/tournament";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <SiteHeader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="/battle" element={<BattlePage />} />
        <Route path="/tournament" element={<TournamentPage />} />
        <Route path="/strategies" element={<StrategiesPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <footer className="site-footer">
        <span>AXELROD ARENA · CLASSIC BUILD 02</span>
        <span>COOPERATE / DEFECT / REPEAT</span>
      </footer>
    </>
  );
}
