import { randomUUID } from "node:crypto";
export function correlationMiddleware(req, res, next) { const id = req.correlationId || randomUUID(); req.correlationId = id; res.set("x-correlation-id", id); next(); }
