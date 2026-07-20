import { defineEventHandler, send } from "h3";

import auth from "./auth";

export default defineEventHandler(async (event) => {
  // API Key validation
  const { url, headers } = event.req;
  const apiKey = headers["api-key"];

  if (url && url.startsWith("/api/addHorse")) {
    await auth(event); // Call your authentication middleware for every request
    return;
  }
  if (url && url.startsWith("/api/report-horses-ids")) {
    await auth(event); // Call your authentication middleware for every request
    return;
  }

  if (url && url.startsWith("/api/add-full-horse-details")) {
    await auth(event); // Call your authentication middleware for every request
    return;
  }
  if (url && url.startsWith("/api/uploadImages")) {
    await auth(event); // Call your authentication middleware for every request
    return;
  }

  if (url && url.startsWith("/api/user-info")) {
    await auth(event); // Call your authentication middleware for every request
    return;
  }

  if (url && url.startsWith("/api/refresh-token")) {
    return;
  }

  if (url && url.startsWith("/api/login")) {
    return;
  }

  if (url && url.startsWith("/api")) {
    // Validate the API key
    if (apiKey !== process.env.VITE_API_KEY) {
      return {
        statusCode: 401,
        statusMessage: "Unauthorized: Invalid API key" // Technical message
      };
    }
  }

  // Return empty response for non-matching routes
  return;
});
