import { ref } from "vue";
import { jwtDecode } from "jwt-decode";

// Only define token management if we're in a client context
const isClient = process.client;

const accessToken = ref(
  isClient ? localStorage.getItem("accessToken") || null : null
);
const refreshToken = ref(
  isClient ? localStorage.getItem("refreshToken") || null : null
);

onMounted(() => {
  accessToken.value = localStorage.getItem("accessToken") || null;
  refreshToken.value = localStorage.getItem("refreshToken") || null;
});

const tokenExpiryTime = ref(null);

export function setTokens(access, refresh) {
  accessToken.value = access;
  refreshToken.value = refresh;
  if (isClient) {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
  }
  const decodedToken = jwtDecode(access);
  tokenExpiryTime.value = decodedToken.exp * 1000; // Convert to milliseconds
  scheduleTokenRefresh();
}

export function clearTokens() {
  accessToken.value = null;
  refreshToken.value = null;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export async function refreshAccessToken() {
  try {
    const response = await fetch("/api/refresh-token", {
      method: "POST",
      body: JSON.stringify({ refreshToken: refreshToken.value }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      setTokens(data.accessToken, data.refreshToken);
    } else {
      throw new Error("Refresh token expired or invalid");
    }
  } catch (error) {
    console.error("Token refresh failed", error);
    clearTokens();
  }
}

export function scheduleTokenRefresh() {
  if (tokenExpiryTime.value) {
    const expiresIn = tokenExpiryTime.value - Date.now() - 5000; // Refresh 5 seconds before expiry
    setTimeout(() => {
      refreshAccessToken();
    }, expiresIn);
  }
}

if (accessToken.value) {
  const decodedToken = jwtDecode(accessToken.value);
  tokenExpiryTime.value = decodedToken.exp * 1000; // Convert to milliseconds
  scheduleTokenRefresh();
}

export async function fetchWithToken(url, options = {}) {
  const headers = options.headers || {};
  headers["Authorization"] = `Bearer ${accessToken.value}`;

  let response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.statusCode === 401) {
    await refreshAccessToken(); // Refresh the token

    if (accessToken.value) {
      headers["Authorization"] = `Bearer ${accessToken.value}`;
      response = await fetch(url, {
        ...options,
        headers,
      });
    }
  }

  return response;
}

// Function to check if the user is logged in
export function isLoggedIn() {
  return !!accessToken.value; // Returns true if accessToken is present
}
