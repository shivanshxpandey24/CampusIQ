export async function readApiResponse(response: Response, fallbackError: string) {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`${fallbackError} (HTTP ${response.status})`);
    }
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    const error = body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : `${fallbackError} (HTTP ${response.status})`;
    throw new Error(error);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("The server returned an invalid response.");
  }
  return body;
}
