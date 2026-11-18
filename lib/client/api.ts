export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

const PASSCODE_KEY = "wds-passcode";

export function loadPasscode(): string {
  try {
    return localStorage.getItem(PASSCODE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePasscode(value: string) {
  try {
    if (value) localStorage.setItem(PASSCODE_KEY, value);
    else localStorage.removeItem(PASSCODE_KEY);
  } catch {
    // Storage can be blocked (private mode); the passcode then lasts for this visit only.
  }
}

export async function postJSON<T>(url: string, body: unknown, passcode: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(passcode ? { "x-app-passcode": passcode } : {}) },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("Couldn't connect to the server. Check your internet connection and try again.", 0);
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string; code?: string }) | null;
  if (!res.ok || !data) {
    if (data?.error) throw new ApiError(data.error, res.status, data.code);
    if (res.status === 413) throw new ApiError("That photo is too large to upload. Please try a smaller photo.", 413);
    if (res.status === 504) throw new ApiError("The server took too long to respond. Please try again.", 504);
    throw new ApiError(`The server returned an error (${res.status}). Please try again.`, res.status);
  }
  return data;
}
