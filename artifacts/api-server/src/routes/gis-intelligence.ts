import { Router } from "express";
import {
  getGisSummary,
  getWardMetrics,
} from "../services/gis-intelligence";

const router = Router();

router.get("/summary", async (_req, res, next) => {
  try {
    res.json(await getGisSummary());
  } catch (error) {
    next(error);
  }
});

router.get("/wards", async (_req, res, next) => {
  try {
    res.json(await getWardMetrics());
  } catch (error) {
    next(error);
  }
});

export default router;
