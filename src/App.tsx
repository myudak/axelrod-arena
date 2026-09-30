import { useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router";
import { MotionPreference } from "@/components/settings-controls";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/toaster";
import BattlePage from "@/routes/battle";
import CampaignPage from "@/routes/campaign";
import EvolutionPage from "@/routes/evolution";
import Home from "@/routes/home";
import LabPage from "@/routes/lab";
import NotFound from "@/routes/not-found";
import PlayPage from "@/routes/play";
import ProfilePage from "@/routes/profile";
import ResearchPage from "@/routes/research";
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
      <MotionPreference />
      <SiteHeader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="/campaign" element={<CampaignPage />} />
        <Route path="/battle" element={<BattlePage />} />
        <Route path="/tournament" element={<TournamentPage />} />
        <Route path="/strategies" element={<StrategiesPage />} />
        <Route path="/evolution" element={<EvolutionPage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/lab" element={<LabPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
      <footer className="site-footer">
        <span>AXELROD ARENA · BUILD 03</span>
        <span className="site-footer__links">
          <Link to="/research">RESEARCH</Link>
          <Link to="/profile">PROFILE</Link>
          <span>COOPERATE / DEFECT / REPEAT</span>
        </span>
      </footer>
    </>
  );
}
