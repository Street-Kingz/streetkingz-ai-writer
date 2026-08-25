import { randomUUID } from "node:crypto";
export function correlationMiddleware(req, res, next) { const id = randomUUID(); req.correlationId = id; res.set("x-correlation-id", id); next(); }
