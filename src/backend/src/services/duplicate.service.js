import { CivicIssue } from "../models/CivicIssue.js";
import { Evidence } from "../models/Evidence.js";
import { IssueCategory } from "../models/IssueCategory.js";
import { haversineMeters, hamming, jaccard } from "./priority.service.js";

function distanceScore(meters, radius) {
  if (meters == null) return 0;
  if (meters <= radius * 0.25) return 1;
  if (meters >= radius) return Math.max(0, 1 - (meters - radius) / radius);
  return 1 - meters / (radius * 2);
}

export async function findNearbyIssues({ lng, lat, categoryId }) {
  if (lng == null || lat == null) return [];
  const category = categoryId ? await IssueCategory.findById(categoryId) : null;
  const radius = category?.duplicateRadiusMeters || 75;
  const issues = await CivicIssue.find({
    status: { $nin: ["REJECTED"] },
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: Math.max(radius * 2, 150),
      },
    },
  })
    .populate("categoryId")
    .populate("zoneId", "code displayName")
    .limit(12);

  return issues.map((issue) => {
    const [ilng, ilat] = issue.location.coordinates;
    return {
      issue,
      distanceMeters: Math.round(haversineMeters(lng, lat, ilng, ilat)),
    };
  });
}

export async function scoreDuplicates({ report, evidence, category }) {
  const coords = report.capturedLocation?.coordinates;
  if (!coords || coords.length < 2) {
    return { candidates: [], best: null };
  }
  const [lng, lat] = coords;
  const nearby = await findNearbyIssues({ lng, lat, categoryId: category?._id });
  const radius = category?.duplicateRadiusMeters || 75;

  const scored = [];
  for (const row of nearby) {
    const issue = row.issue;
    const catScore = String(issue.categoryId?._id) === String(category?._id) ? 1 : 0.2;
    const textSim = jaccard(report.description, `${issue.title} ${issue.description}`);
    let imageSim = 0.3;
    if (evidence?.perceptualHash) {
      const others = await Evidence.find({ issueId: issue._id, type: "BEFORE" }).limit(5);
      const hamValues = others
        .map((e) => hamming(evidence.perceptualHash, e.perceptualHash))
        .filter((n) => Number.isFinite(n));
      const bestHam = hamValues.length ? Math.min(...hamValues) : 64;
      imageSim = 1 - bestHam / 64;
    }
    const ageHours = (Date.now() - new Date(issue.createdAt).getTime()) / 3600000;
    const timeProximity = ageHours < 24 ? 1 : ageHours < 168 ? 0.6 : 0.3;
    const dScore = distanceScore(row.distanceMeters, radius);
    const duplicateScore = Math.round(
      (dScore * 0.35 + catScore * 0.2 + textSim * 0.2 + imageSim * 0.2 + timeProximity * 0.05) *
        100
    );
    let decision = "CREATE";
    if (duplicateScore >= 80) decision = "STRONG";
    else if (duplicateScore >= 55) decision = "POSSIBLE";
    scored.push({
      issueId: issue._id,
      publicId: issue.publicId,
      title: issue.title,
      status: issue.status,
      distanceMeters: row.distanceMeters,
      duplicateScore,
      decision,
    });
  }
  scored.sort((a, b) => b.duplicateScore - a.duplicateScore);
  return { candidates: scored, best: scored[0] || null };
}
