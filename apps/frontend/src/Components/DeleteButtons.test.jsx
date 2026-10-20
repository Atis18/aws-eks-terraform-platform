import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmployeeDeleteButton from "./EmployeeTable/components/DeleteButton";
import EquipmentDeleteButton from "./EquipmentTable/components/DeleteButton";
import { deleteEmployee } from "../client/employees";
import { deleteEquipment } from "../client/equipments";

vi.mock("../client/employees", () => ({ deleteEmployee: vi.fn() }));
vi.mock("../client/equipments", () => ({ deleteEquipment: vi.fn() }));

beforeEach(() => {
  vi.mocked(deleteEmployee).mockReset();
  vi.mocked(deleteEquipment).mockReset();
});

describe.each([
  ["employee", EmployeeDeleteButton, deleteEmployee, "employeeId"],
  ["equipment", EquipmentDeleteButton, deleteEquipment, "equipmentId"],
])("%s delete button", (_label, Component, deleteApi, idProp) => {
  it("does not remove a row if Firebase rejects the deletion", async () => {
    vi.mocked(deleteApi).mockRejectedValue(new Error("Deleting failed (HTTP 401)."));
    const onDelete = vi.fn();
    render(<Component {...{ [idProp]: "test-id", onDelete }} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("HTTP 401");
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("updates the UI only after Firebase confirms deletion", async () => {
    vi.mocked(deleteApi).mockResolvedValue(undefined);
    const onDelete = vi.fn();
    render(<Component {...{ [idProp]: "test-id", onDelete }} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("test-id"));
  });
});
