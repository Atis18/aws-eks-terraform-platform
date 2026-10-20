import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EquipmentForm from "./EquipmentForm";

describe("equipment form", () => {
  it("submits the amount as a number", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<EquipmentForm onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText("Name:"), "Monitor");
    await user.type(screen.getByLabelText("Type:"), "Screen");
    await user.type(screen.getByLabelText("Amount:"), "3");
    await user.click(screen.getByRole("button", { name: "Create Equipment" }));

    expect(onSave).toHaveBeenCalledWith({ name: "Monitor", type: "Screen", amount: 3 });
  });

  it("constrains amount to nonnegative whole numbers", () => {
    render(<EquipmentForm onSave={vi.fn()} onCancel={vi.fn()} />);
    const amount = screen.getByLabelText("Amount:");
    expect(amount).toHaveAttribute("type", "number");
    expect(amount).toHaveAttribute("min", "0");
    expect(amount).toHaveAttribute("step", "1");
  });
});
