import jwt from "jsonwebtoken";

export const verifyToken = (accessToken: string) => {
  const secret = process.env.VITE_JWT_SECRET || "your_jwt_secret";

  // Check if the token is provided
  if (!accessToken) {
    throw new Error("Token is missing");
  }

  // Optional: Decode the token without verifying to validate its structure
  const decoded = jwt.decode(accessToken, { complete: true });
  if (!decoded) {
    throw new Error("Malformed token");
  }

  return new Promise((resolve, reject) => {
    jwt.verify(accessToken, secret, (err, decoded) => {
      if (err) {
        console.error("JWT verification error:", err.message); // Log error details
        return reject(err); // Reject the promise if verification fails
      }
      resolve(decoded); // Resolve the promise with decoded data
    });
  });
};
