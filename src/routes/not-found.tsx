import { PixelLink, ScreenTitle } from "@/components/retro";
import { PageMeta } from "@/components/page-meta";

export default function NotFound() {
  return (
    <main className="app-shell">
      <PageMeta title="Not found" description="This page does not exist." />
      <ScreenTitle title="404 · NO MATCH FOUND" description="This round never happened. Head back to the arena." />
      <PixelLink href="/">◀ BACK TO ARENA</PixelLink>
    </main>
  );
}
