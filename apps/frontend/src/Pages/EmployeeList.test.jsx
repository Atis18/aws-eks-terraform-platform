import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import EmployeeList from "./EmployeeList";
import { deleteEmployee, getAllEmployees } from "../client/employees";

vi.mock("../client/employees", () => ({
  getAllEmployees: vi.fn(),
  deleteEmployee: vi.fn(),
}));

const makeEmployee = (id, firstName, position = "Engineer", level = "Junior") => ({
  id: String(id),
  name: { firstName, middleName: "", lastName: "User" },
  position,
  level,
  equipment: "N/A",
});

const renderList = () => render(<MemoryRouter><EmployeeList /></MemoryRouter>);
const displayedNames = () => within(screen.getByRole("table"))
  .getAllByRole("row")
  .slice(1)
  .map((row) => within(row).getAllByRole("cell")[0].textContent.replace(/\s+/g, " ").trim());

beforeEach(() => {
  vi.mocked(deleteEmployee).mockResolvedValue(undefined);
});

describe("employee list", () => {
  it("filters by position and level (case-insensitive)", async () => {
    vi.mocked(getAllEmployees).mockResolvedValue([
      makeEmployee(1, "Alice", "Engineer", "Junior"),
      makeEmployee(2, "Bob", "Designer", "Junior"),
      makeEmployee(3, "Charlie", "Engineer", "Senior"),
    ]);
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("table");

    await user.type(screen.getByLabelText("Position"), "ENGINEER");
    await user.type(screen.getByLabelText("Level"), "junior");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(displayedNames()).toEqual(["Alice User"]);
  });

  it("shows a styled empty state and no pagination when a filter finds nothing", async () => {
    vi.mocked(getAllEmployees).mockResolvedValue([makeEmployee(1, "Alice")]);
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("table");

    await user.type(screen.getByLabelText("Position"), "Astronaut");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByText("No employees found")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("sorts positions alphabetically in both directions", async () => {
    vi.mocked(getAllEmployees).mockResolvedValue([
      makeEmployee(1, "Alice", "Zoologist"),
      makeEmployee(2, "Bob", "Analyst"),
      makeEmployee(3, "Carol", "Developer"),
    ]);
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("table");

    await user.selectOptions(screen.getByLabelText("Order By"), "position");
    expect(displayedNames()).toEqual(["Bob User", "Carol User", "Alice User"]);

    await user.selectOptions(screen.getByLabelText("Direction"), "desc");
    expect(displayedNames()).toEqual(["Alice User", "Carol User", "Bob User"]);
  });

  it("shows ten employees per page", async () => {
    vi.mocked(getAllEmployees).mockResolvedValue(Array.from({ length: 12 }, (_, i) =>
      makeEmployee(i + 1, `Employee${String(i + 1).padStart(2, "0")}`)));
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("table");

    expect(displayedNames()).toHaveLength(10);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(displayedNames()).toEqual(["Employee11 User", "Employee12 User"]);
  });

  it("returns to a valid page after deleting the final employee on page two", async () => {
    vi.mocked(getAllEmployees).mockResolvedValue(Array.from({ length: 11 }, (_, i) =>
      makeEmployee(i + 1, `Employee${String(i + 1).padStart(2, "0")}`)));
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(displayedNames()).toEqual(["Employee11 User"]);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteEmployee).toHaveBeenCalledWith("11"));
    await waitFor(() => expect(displayedNames()).toHaveLength(10));
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("renders a useful error if loading fails", async () => {
    vi.mocked(getAllEmployees).mockRejectedValue(new Error("Loading employees failed (HTTP 401)."));
    renderList();
    expect(await screen.findByRole("alert")).toHaveTextContent("HTTP 401");
  });
});
