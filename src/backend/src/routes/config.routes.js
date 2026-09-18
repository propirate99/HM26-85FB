import { Router } from "express";
import { IssueCategory } from "../models/IssueCategory.js";
import { Zone } from "../models/Zone.js";
import { getSlaHours } from "../services/sla.service.js";

export const configRoutes = Router();

configRoutes.get("/categories", async (_req, res, next) => {
  try {
    res.json({ categories: await IssueCategory.find() });
  } catch (err) {
    next(err);
  }
});

configRoutes.get("/zones", async (_req, res, next) => {
  try {
    res.json({ zones: await Zone.find({ isActive: true }) });
  } catch (err) {
    next(err);
  }
});

configRoutes.get("/slas", async (_req, res, next) => {
  try {
    res.json({ slas: await getSlaHours() });
  } catch (err) {
    next(err);
  }
});
