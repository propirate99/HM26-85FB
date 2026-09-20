function normalizeRole(role) {
  if (!role) return "";
  const r = String(role).toLowerCase();
  if (r === "main_authority" || r === "admin") return "admin";
  if (r === "zone_officer" || r === "officer") return "officer";
  if (r === "citizen") return "citizen";
  return r;
}

export function requireRole(...roles) {
  const flatRoles = roles.flat().map(normalizeRole);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const userRole = normalizeRole(req.user.role);
    if (!flatRoles.includes(userRole)) {
      return res.status(403).json({ error: "Not permitted for this role" });
    }
    next();
  };
}

