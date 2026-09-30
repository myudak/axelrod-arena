import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import { MotionPreference } from "@/components/settings-controls";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/toaster";
import BattlePage from "@/routes/battle";
import CampaignPage from "@/routes/campaign";
import Home from "@/routes/home";
import LabPage from "@/routes/lab";
import NotFound from "@/routes/not-found";
import PlayPage from "@/routes/play";
import ProfilePage from "@/routes/profile";
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
        <Route path="/lab" element={<LabPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
      <footer className="site-footer">
        <span>AXELROD ARENA · CLASSIC BUILD 02</span>
        <span>COOPERATE / DEFECT / REPEAT</span>
      </footer>
    </>
  );
}
