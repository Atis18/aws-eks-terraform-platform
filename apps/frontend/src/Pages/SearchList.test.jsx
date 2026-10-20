import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SearchList from "./SearchList";
import { searchEmployees } from "../client/employees";

vi.mock("../client/employees", () => ({
  searchEmployees: vi.fn(),
  deleteEmployee: vi.fn(),
}));

const renderSearch = (initialPath = "/employees") => render(
  <MemoryRouter initialEntries={[initialPath]}>
    <Routes>
      <Route path="/employees/:search?" element={<SearchList />} />
    </Routes>
  </MemoryRouter>
);

describe("search page", () => {
  it("searches immediately when a URL parameter is present", async () => {
    vi.mocked(searchEmployees).mockResolvedValue([{
      id: "1", name: { firstName: "Robert", lastName: "Smith" },
      level: "Junior", position: "Engineer", equipment: "N/A",
    }]);

    renderSearch("/employees/robert");
    expect(await screen.findByRole("table")).toHaveTextContent("Robert");
    expect(searchEmployees).toHaveBeenCalledWith("robert");
    expect(screen.getByRole("textbox", { name: "Name:" })).toHaveValue("robert");
  });

  it("navigates and searches for a name entered in the form", async () => {
    vi.mocked(searchEmployees).mockResolvedValue([]);
    const user = userEvent.setup();
    renderSearch();
    expect(screen.getByText("Search employees")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Name:" }), "Alice");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("No employees found")).toBeInTheDocument();
    expect(searchEmployees).toHaveBeenCalledWith("Alice");
  });

  it("shows a proper error instead of an empty result on request failure", async () => {
    vi.mocked(searchEmployees).mockRejectedValue(new Error("Searching employees failed (HTTP 400)."));
    renderSearch("/employees/robert");
    expect(await screen.findByRole("alert")).toHaveTextContent("HTTP 400");
  });
});
