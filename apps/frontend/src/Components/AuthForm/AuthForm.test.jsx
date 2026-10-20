import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthForm from "./AuthForm";

const setup = (props = {}) => {
  const onSubmit = vi.fn();
  const onGoogleAuth = vi.fn();
  render(<AuthForm isSignIn={false} onSubmit={onSubmit} onGoogleAuth={onGoogleAuth} {...props} />);
  return { onSubmit, onGoogleAuth };
};

const fill = async (user, password, confirm) => {
  await user.type(screen.getByLabelText("Email"), "person@example.com");
  await user.type(screen.getByLabelText("Password"), password);
  await user.type(screen.getByLabelText("Confirm"), confirm);
  await user.click(screen.getByRole("button", { name: "Sign Up" }));
};

describe("sign-up form", () => {
  it("shows a styled alert for a password that is too short", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await fill(user, "short", "short");

    expect(screen.getByText("Error:")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveClass("alert-danger");
    expect(screen.getByRole("alert")).toHaveTextContent("at least 6 characters");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await fill(user, "secret123", "secret456");

    expect(screen.getByRole("alert")).toHaveTextContent("passwords do not match");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid credentials", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await fill(user, "secret123", "secret123");

    expect(onSubmit).toHaveBeenCalledWith({ email: "person@example.com", password: "secret123" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("displays Firebase errors with the same styled alert", () => {
    setup({ errorMessage: "This email address is already registered." });
    expect(screen.getByText("Error:")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveClass("alert-danger");
    expect(screen.getByRole("alert")).toHaveTextContent("already registered");
  });

  it("calls the Google sign-in handler", async () => {
    const user = userEvent.setup();
    const { onGoogleAuth } = setup();
    await user.click(screen.getByRole("button", { name: "Sign in with Google" }));
    expect(onGoogleAuth).toHaveBeenCalledOnce();
  });
});
