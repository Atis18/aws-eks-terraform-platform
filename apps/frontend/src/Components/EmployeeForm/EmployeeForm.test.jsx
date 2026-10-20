import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmployeeForm from "./EmployeeForm";
import { getAllEquipments } from "../../client/equipments";

vi.mock("../../client/equipments", () => ({ getAllEquipments: vi.fn() }));

describe("employee form", () => {
  it("saves an employee with a lowercase fullName and selected equipment", async () => {
    vi.mocked(getAllEquipments).mockResolvedValue([{ id: "laptop", name: "Laptop" }]);
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<EmployeeForm onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText("First Name:"), "Robert");
    await user.type(screen.getByLabelText("Last Name:"), "Brown");
    await user.type(screen.getByLabelText("Level:"), "Junior");
    await user.type(screen.getByLabelText("Position:"), "Engineer");
    await screen.findByRole("option", { name: "Laptop" });
    await user.selectOptions(screen.getByRole("combobox"), "laptop");
    await user.click(screen.getByRole("button", { name: "Create Employee" }));

    expect(onSave).toHaveBeenCalledWith({
      fullName: "robert brown",
      name: { firstName: "Robert", middleName: "", lastName: "Brown" },
      position: "Engineer",
      level: "Junior",
      equipment: "laptop",
    });
  });

  it("reports equipment loading failures", async () => {
    vi.mocked(getAllEquipments).mockRejectedValue(new Error("Equipment API unavailable"));
    render(<EmployeeForm onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Equipment API unavailable");
  });
});
