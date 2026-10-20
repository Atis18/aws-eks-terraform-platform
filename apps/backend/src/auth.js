import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export async function verifyFirebaseToken(token) {
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is not configured.");
  }

  const firebaseApp =
    getApps().find((app) => app.name === "employee-madness-backend") ??
    initializeApp({ projectId }, "employee-madness-backend");

  return getAuth(firebaseApp).verifyIdToken(token);
}

export function requireAuth(verifyToken = verifyFirebaseToken) {
  return async (req, res, next) => {
    const authorization = req.get("Authorization") ?? "";
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);

    if (!match) {
      return res.status(401).json({
        error: "Unauthorized.",
      });
    }

    try {
      const decodedToken = await verifyToken(match[1]);

      req.user = {
        uid: decodedToken.uid,
      };

      return next();
    } catch {
      return res.status(401).json({
        error: "Unauthorized.",
      });
    }
  };
}