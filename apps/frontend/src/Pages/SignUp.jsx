import { Link } from "react-router-dom";
import AuthForm from "../Components/AuthForm";
import { useAuth } from "../Context/AuthProvider";
import { useEffect } from "react";

const SignUp = () => {
  const { signUpWithCreds, signInWithGoogle, error, reset } = useAuth();

  useEffect(() => {
    reset();
  }, [reset]);

  const handleSubmit = ({ email, password }) => {
    signUpWithCreds(email, password);
  };

  return (
    <main className="auth-page">
      <h1>Sign Up</h1>
      <AuthForm
        isSignIn={false}
        onSubmit={handleSubmit}
        onGoogleAuth={signInWithGoogle}
        errorMessage={error}
      />
      <Link to="/sign-in">Sign In</Link>
    </main>
  );
};

export default SignUp;
