import { ZodError } from "zod";
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
    public retryAfter?: number,
  ) {
    super(message);
  }
}
export function assertSameOrigin(request: Request, appUrl: string) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(appUrl).origin)
    throw new ApiError("Request origin is not allowed", 403);
}
export function errorResponse(error: unknown): Response {
  const known = error instanceof ApiError;
  const message = known
    ? error.message
    : error instanceof ZodError
      ? error.issues
          .map((x) => x.message)
          .slice(0, 3)
          .join(". ")
      : "The service could not complete this request. Try again shortly.";
  return Response.json(
    { error: message },
    {
      status: known ? error.status : error instanceof ZodError ? 400 : 502,
      headers: {
        "Cache-Control": "no-store",
        ...(known && error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {}),
      },
    },
  );
}
