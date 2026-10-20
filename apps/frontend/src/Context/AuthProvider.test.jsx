import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useIdToken } from "react-firebase-hooks/auth";
import {
  AuthErrorCodes,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import AuthProvider, { useAuth } from "./AuthProvider";

vi.mock("react-firebase-hooks/auth", () => ({ useIdToken: vi.fn() }));
vi.mock("../firebase/auth", () => ({ default: { app: "mock-firebase-auth" } }));
vi.mock("firebase/auth", () => ({
  AuthErrorCodes: { INVALID_LOGIN_CREDENTIALS: "auth/invalid-credential" },
  GoogleAuthProvider: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

function AuthActions() {
  const { user, error, signUpWithCreds, signInWithCreds, signInWithGoogle, signOut: logOut, reset } = useAuth();
  return (
    <div>
      <span>{user?.uid ?? "Guest"}</span>
      {error && <p role="alert">{error}</p>}
      <button onClick={() => signUpWithCreds("test@example.com", "password123")}>Register</button>
      <button onClick={() => signInWithCreds("test@example.com", "password123")}>Log in</button>
      <button onClick={signInWithGoogle}>Google log in</button>
      <button onClick={logOut}>Log out</button>
      <button onClick={reset}>Dismiss error</button>
    </div>
  );
}

beforeEach(() => {
  vi.mocked(useIdToken).mockReturnValue([{ uid: "demo-user" }, false]);
  vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({});
  vi.mocked(signInWithEmailAndPassword).mockResolvedValue({});
  vi.mocked(signInWithPopup).mockResolvedValue({});
  vi.mocked(signOut).mockResolvedValue(undefined);
});

const renderProvider = () => render(<AuthProvider><AuthActions /></AuthProvider>);

describe("authentication provider", () => {
  it("holds back protected children while Firebase loads the authentication state", () => {
    vi.mocked(useIdToken).mockReturnValue([null, true]);
    const { container } = renderProvider();
    expect(container.querySelector(".Loading")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Register" })).not.toBeInTheDocument();
  });

  it("maps sign-up errors to helpful feedback and lets the user dismiss them", async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValue({ code: "auth/email-already-in-use" });
    const user = userEvent.setup();
    renderProvider();
    await user.click(screen.getByRole("button", { name: "Register" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already registered");
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), "test@example.com", "password123"
    );
    await user.click(screen.getByRole("button", { name: "Dismiss error" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports invalid login credentials", async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue({
      code: AuthErrorCodes.INVALID_LOGIN_CREDENTIALS,
    });
    const user = userEvent.setup();
    renderProvider();
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong Credentials");
  });

  it("connects Google sign-in and logout to Firebase", async () => {
    const user = userEvent.setup();
    renderProvider();
    expect(screen.getByText("demo-user")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Google log in" }));
    expect(signInWithPopup).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(signOut).toHaveBeenCalledOnce();
  });
});
