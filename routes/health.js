import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ status: "ok", message: "Street Kingz AI writer service running" });
});

export default router;
