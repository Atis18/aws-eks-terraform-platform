import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import EmployeeCreator from "./EmployeeCreator";
import EmployeeUpdater from "./EmployeeUpdater";
import EquipmentCreator from "./EquipmentCreator";
import EquipmentUpdater from "./EquipmentUpdater";
import {
  createEmployee,
  getOneEmployeeById,
  updateEmployee,
} from "../client/employees";
import {
  createEquipment,
  getAllEquipments,
  getOneEquipmentById,
  updateEquipment,
} from "../client/equipments";

vi.mock("../client/employees", () => ({
  createEmployee: vi.fn(),
  getOneEmployeeById: vi.fn(),
  updateEmployee: vi.fn(),
}));
vi.mock("../client/equipments", () => ({
  createEquipment: vi.fn(),
  getAllEquipments: vi.fn(),
  getOneEquipmentById: vi.fn(),
  updateEquipment: vi.fn(),
}));

const employee = {
  id: "emp1",
  fullName: "alice smith",
  name: { firstName: "Alice", middleName: "", lastName: "Smith" },
  position: "Developer",
  level: "Junior",
  equipment: "N/A",
};
const equipment = { id: "laptop1", name: "Laptop", type: "Computer", amount: 2 };

const renderAt = (url) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes>
      <Route path="/list/new" element={<EmployeeCreator />} />
      <Route path="/list/:id/edit" element={<EmployeeUpdater />} />
      <Route path="/list" element={<p>Employee list page</p>} />
      <Route path="/equipments/new" element={<EquipmentCreator />} />
      <Route path="/equipments/:id/edit" element={<EquipmentUpdater />} />
      <Route path="/equipments" element={<p>Equipment list page</p>} />
    </Routes>
  </MemoryRouter>
);

beforeEach(() => {
  vi.mocked(getAllEquipments).mockResolvedValue([]);
  vi.mocked(createEmployee).mockResolvedValue(undefined);
  vi.mocked(updateEmployee).mockResolvedValue(undefined);
  vi.mocked(getOneEmployeeById).mockResolvedValue(employee);
  vi.mocked(createEquipment).mockResolvedValue(undefined);
  vi.mocked(updateEquipment).mockResolvedValue(undefined);
  vi.mocked(getOneEquipmentById).mockResolvedValue(equipment);
});

const fillEmployee = async (user) => {
  await user.type(screen.getByLabelText("First Name:"), "Alice");
  await user.type(screen.getByLabelText("Last Name:"), "Smith");
  await user.type(screen.getByLabelText("Position:"), "Developer");
  await user.type(screen.getByLabelText("Level:"), "Junior");
};
const fillEquipment = async (user) => {
  await user.type(screen.getByLabelText("Name:"), "Laptop");
  await user.type(screen.getByLabelText("Type:"), "Computer");
  await user.type(screen.getByLabelText("Amount:"), "2");
};

describe("employee creation and update pages", () => {
  it("creates an employee and navigates back to the list", async () => {
    const user = userEvent.setup();
    renderAt("/list/new");
    await fillEmployee(user);
    await user.click(screen.getByRole("button", { name: "Create Employee" }));
    await waitFor(() => expect(createEmployee).toHaveBeenCalledWith(expect.objectContaining({
      fullName: "alice smith",
      position: "Developer",
      level: "Junior",
    })));
    expect(await screen.findByText("Employee list page")).toBeInTheDocument();
  });

  it("shows the API error and remains on the form when creation fails", async () => {
    vi.mocked(createEmployee).mockRejectedValue(new Error("Employee save failed"));
    const user = userEvent.setup();
    renderAt("/list/new");
    await fillEmployee(user);
    await user.click(screen.getByRole("button", { name: "Create Employee" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Employee save failed");
    expect(screen.getByRole("button", { name: "Create Employee" })).toBeEnabled();
    expect(screen.queryByText("Employee list page")).not.toBeInTheDocument();
  });

  it("loads an employee and saves updates to the URL id", async () => {
    const user = userEvent.setup();
    renderAt("/list/emp1/edit");
    expect(await screen.findByDisplayValue("Alice")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Update Employee" }));
    await waitFor(() => expect(updateEmployee).toHaveBeenCalledWith("emp1", expect.objectContaining({
      fullName: "alice smith",
    })));
    expect(await screen.findByText("Employee list page")).toBeInTheDocument();
  });

  it("shows a load error rather than an editable form if lookup fails", async () => {
    vi.mocked(getOneEmployeeById).mockRejectedValue(new Error("Employee not found in API"));
    renderAt("/list/emp1/edit");
    expect(await screen.findByRole("alert")).toHaveTextContent("Employee not found in API");
    expect(screen.queryByRole("button", { name: "Update Employee" })).not.toBeInTheDocument();
  });
});

describe("equipment creation and update pages", () => {
  it("creates equipment and navigates back to its list", async () => {
    const user = userEvent.setup();
    renderAt("/equipments/new");
    await fillEquipment(user);
    await user.click(screen.getByRole("button", { name: "Create Equipment" }));
    await waitFor(() => expect(createEquipment).toHaveBeenCalledWith({
      name: "Laptop", type: "Computer", amount: 2,
    }));
    expect(await screen.findByText("Equipment list page")).toBeInTheDocument();
  });

  it("stays on the form and shows an error when creation fails", async () => {
    vi.mocked(createEquipment).mockRejectedValue(new Error("Equipment save failed"));
    const user = userEvent.setup();
    renderAt("/equipments/new");
    await fillEquipment(user);
    await user.click(screen.getByRole("button", { name: "Create Equipment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Equipment save failed");
    expect(screen.getByRole("button", { name: "Create Equipment" })).toBeEnabled();
  });

  it("loads and updates equipment by ID", async () => {
    const user = userEvent.setup();
    renderAt("/equipments/laptop1/edit");
    expect(await screen.findByDisplayValue("Laptop")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Update Equipment" }));
    await waitFor(() => expect(updateEquipment).toHaveBeenCalledWith("laptop1", {
      name: "Laptop", type: "Computer", amount: 2,
    }));
    expect(await screen.findByText("Equipment list page")).toBeInTheDocument();
  });

  it("renders the API error when loading equipment fails", async () => {
    vi.mocked(getOneEquipmentById).mockRejectedValue(new Error("Equipment lookup failed"));
    renderAt("/equipments/laptop1/edit");
    expect(await screen.findByRole("alert")).toHaveTextContent("Equipment lookup failed");
    expect(screen.queryByRole("button", { name: "Update Equipment" })).not.toBeInTheDocument();
  });
});
