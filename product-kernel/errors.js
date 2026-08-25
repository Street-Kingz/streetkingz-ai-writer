export class ProductError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
export function safeError(error, correlationId) {
  if (error instanceof ProductError) return { status: error.status, body: { error: { code: error.code, message: error.message, correlation_id: correlationId } } };
  return { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "An internal error occurred.", correlation_id: correlationId } } };
}
