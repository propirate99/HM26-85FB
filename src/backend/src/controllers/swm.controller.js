import { swmService } from "../services/swm.service.js";

export const swmController = {
  getWards(req, res, next) {
    try {
      const { zone } = req.query;
      const result = swmService.getWardsSummary(zone);
      return res.json({ success: true, ...result });
    } catch (err) {
      return next(err);
    }
  },

  getFacilities(req, res, next) {
    try {
      const data = swmService.getSwmData();
      return res.json({ success: true, facilities: data.facilities || [] });
    } catch (err) {
      return next(err);
    }
  },

  getWardsGeoJson(req, res, next) {
    try {
      const geo = swmService.getWardsGeoJson();
      return res.json(geo);
    } catch (err) {
      return next(err);
    }
  },

  getFacilitiesGeoJson(req, res, next) {
    try {
      const geo = swmService.getFacilitiesGeoJson();
      return res.json(geo);
    } catch (err) {
      return next(err);
    }
  },
};
