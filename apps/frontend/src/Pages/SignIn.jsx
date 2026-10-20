import { Link } from "react-router-dom";
import AuthForm from "../Components/AuthForm";
import { useAuth } from "../Context/AuthProvider";
import { useEffect } from "react";

const SignIn = () => {
  const { signInWithGoogle, signInWithCreds, error, reset } = useAuth();

  useEffect(() => {
    reset();
  }, [reset]);

  const handleSubmit = async ({ email, password }) => {
    signInWithCreds(email, password);
  };

  return (
    <main className="auth-page">
      <h1>Sign In</h1>
      <AuthForm isSignIn onSubmit={handleSubmit} onGoogleAuth={signInWithGoogle} />
      {error ? <div className="error-box">{error}</div> : null}
      <Link to="/sign-up">Sign up</Link>
    </main>
  );
};

export default SignIn;
