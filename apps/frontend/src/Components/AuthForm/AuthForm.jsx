import { useState } from "react";

const AuthForm = ({ onSubmit, onGoogleAuth, isSignIn, errorMessage }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const changeHandler = (setter) => (e) => {
    setter(e.currentTarget.value);
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!isSignIn && password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (!isSignIn && password !== confirm) {
      setError("The passwords do not match. Please check both fields.");
      return;
    }

    onSubmit({
      email: email.trim(),
      password,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="form-label" htmlFor="email">
          Email
        </label>
        <input
          className="form-control"
          id="email"
          name="email"
          type="email"
          value={email}
          required
          onChange={changeHandler(setEmail)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="password">
          Password
        </label>
        <input
          className="form-control"
          id="password"
          name="password"
          type="password"
          autoComplete={isSignIn ? "current-password" : "new-password"}
          value={password}
          required
          onChange={changeHandler(setPassword)}
        />
      </div>
      {!isSignIn && (
        <div className="mb-3">
          <label className="form-label" htmlFor="confirm">
            Confirm
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            className="form-control"
            required
            onChange={changeHandler(setConfirm)}
          />
        </div>
      )}
      {(error || errorMessage) && (
        <div className="mb-3">
          <p className="form-label fw-semibold text-danger">Error:</p>
          <div className="alert alert-danger mb-0" role="alert">
            {error || errorMessage}
          </div>
        </div>
      )}
      <div className="d-flex justify-content-start gap-3">
        <button className="btn btn-primary" type="submit">{isSignIn ? "Sign In" : "Sign Up"}</button>
        <button className="btn btn-primary" type="button" onClick={onGoogleAuth}>
          Sign in with Google
        </button>
      </div>
    </form>
  );
};

export default AuthForm;
