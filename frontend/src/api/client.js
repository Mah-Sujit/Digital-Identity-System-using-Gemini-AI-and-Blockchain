const API_BASE = "http://127.0.0.1:3001";

let memoryToken = "";

export function getToken() {
  return memoryToken || localStorage.getItem("token") || "";
}

export function setToken(t) {
  memoryToken = t || "";
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

export function setAuthToken(t) {
  setToken(t);
}

export function clearToken() {
  memoryToken = "";
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("pendingOtpEmail");
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
  }

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(data?.error || "Request failed");
    err.response = { status: res.status, data };
    throw err;
  }

  return { status: res.status, data };
}

export const api = {
  get: (path, opts = {}) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts = {}) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts = {}) => request(path, { ...opts, method: "PUT", body }),
  del: (path, opts = {}) => request(path, { ...opts, method: "DELETE" }),
};