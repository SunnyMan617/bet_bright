import type {
  ApiErrorPayload,
  ConvertedSlip,
  DecodedSlip,
  EncodedSlip,
  SelectionIdentity,
} from "../shared/contracts";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T | ApiErrorPayload;
  if (!response.ok) {
    const error = (payload as ApiErrorPayload).error;
    throw new ApiError(error?.message || "The request failed.", error?.code, error?.details);
  }
  return payload as T;
}

export const api = {
  decode: (code: string) =>
    post<DecodedSlip>("/api/v1/slips/decode", { code }),
  encode: (selections: SelectionIdentity[]) =>
    post<EncodedSlip>("/api/v1/slips/encode", { selections }),
  convert: (code: string) =>
    post<ConvertedSlip>("/api/v1/slips/convert", { code }),
};
