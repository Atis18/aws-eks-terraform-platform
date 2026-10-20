import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Protected from "./Protected";
import { useAuth } from "../../Context/AuthProvider";

vi.mock("../../Context/AuthProvider", () => ({ useAuth: vi.fn() }));

const renderRoute = () => render(
  <MemoryRouter initialEntries={["/secret"]}>
    <Routes>
      <Route path="/" element={<p>Public home</p>} />
      <Route path="/secret" element={<Protected><p>Private content</p></Protected>} />
    </Routes>
  </MemoryRouter>
);

describe("protected routes", () => {
  it("redirects guests to the home page", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null });
    renderRoute();
    expect(await screen.findByText("Public home")).toBeInTheDocument();
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
  });

  it("allows logged-in users to see protected content", () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: "test-user" } });
    renderRoute();
    expect(screen.getByText("Private content")).toBeInTheDocument();
  });
});
