import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { App } from "@/App";

describe("App shell", () => {
  it("renders the home page with navigation", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/CAN COOPERATION/i);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const hrefs = [...nav.querySelectorAll("a")].map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/play", "/campaign", "/battle", "/tournament", "/strategies"]);
  });
});
