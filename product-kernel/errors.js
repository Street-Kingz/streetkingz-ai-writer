export class ProductError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
export function safeError(error, correlationId) {
  const code = error?.code || "INTERNAL_ERROR";
  const status = error?.status || (code.startsWith("AUTH_") ? 401 : 500);
  return { status, body: { error: { code, message: code === "INTERNAL_ERROR" ? "An internal error occurred." : error.message, correlation_id: correlationId } } };
}
