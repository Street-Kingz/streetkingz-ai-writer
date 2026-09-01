import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const router = express.Router();
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../internal/v1-04-b1");
const localHost = value => ["localhost", "127.0.0.1", "[::1]"].includes((value || "").split(":")[0]);
const enabled = process.env.V1_04_B1_ACCEPTANCE === "1";
if (enabled) {
  router.use((req, res, next) => localHost(req.hostname) ? next() : res.status(404).end());
  router.get("/internal/v1-04", (_req, res) => res.sendFile("index.html", { root }));
  router.get("/internal/v1-04/harness.js", (_req, res) => res.sendFile("harness.js", { root }));
  router.get("/internal/v1-04/styles.css", (_req, res) => res.sendFile("styles.css", { root }));
}
export default enabled ? router : null;
