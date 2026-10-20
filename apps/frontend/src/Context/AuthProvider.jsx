import { createContext, useState, useCallback, useContext } from "react";
import { useIdToken } from "react-firebase-hooks/auth";
import auth from "../firebase/auth";
import Loading from "../Components/Loading";
import {
  signOut as fbSignOut,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  AuthErrorCodes,
} from "firebase/auth";

const AuthContext = createContext(null);

const getSignUpErrorMessage = (error) => {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "This email address is already registered. Try signing in instead.";
    case "auth/invalid-email":
    case "auth/missing-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
    case "auth/invalid-password":
      return "Your password is too weak. Use at least 6 characters.";
    case "auth/password-does-not-meet-requirements":
      return "Your password does not meet the security requirements. Please choose a stronger password.";
    case "auth/operation-not-allowed":
      return "Email and password registration is not enabled for this project.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a little and try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    default:
      return "Registration failed. Please try again.";
  }
};

function AuthProvider({ children }) {
  const [user, loading] = useIdToken(auth);
  const [error, setError] = useState(null);

  const signInWithCreds = useCallback((email, password) => {
    setError(null);
    return signInWithEmailAndPassword(auth, email, password).catch((err) => {
      if (err.code === AuthErrorCodes.INVALID_LOGIN_CREDENTIALS) {
        setError("Wrong Credentials");
      } else {
        setError("Authentication error");
      }
    });
  }, []);

  const signUpWithCreds = useCallback((email, password) => {
    setError(null);
    return createUserWithEmailAndPassword(auth, email, password).catch((err) => {
      setError(getSignUpErrorMessage(err));
    });
  }, []);

  const signInWithGoogle = useCallback(() => {
    setError(null);
    const google = new GoogleAuthProvider();
    return signInWithPopup(auth, google).catch((err) => {
      console.error(err);
      setError("Error in google auth");
    });
  }, []);

  const signOut = useCallback(() => {
    setError(null);
    return fbSignOut(auth);
  }, []);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        error,
        user,
        signOut,
        signInWithCreds,
        signUpWithCreds,
        signInWithGoogle,
        reset,
      }}
    >
      {loading ? <Loading /> : children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

// eslint-disable-next-line react-refresh/only-export-components
export const useToken = () => useAuth()?.user?.accessToken;

export default AuthProvider;
