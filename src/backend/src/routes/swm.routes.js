import { Router } from "express";
import { swmController } from "../controllers/swm.controller.js";

const router = Router();

router.get("/wards", swmController.getWards);
router.get("/facilities", swmController.getFacilities);
router.get("/geojson/wards", swmController.getWardsGeoJson);
router.get("/geojson/facilities", swmController.getFacilitiesGeoJson);

export default router;
