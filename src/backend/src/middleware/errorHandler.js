export function errorHandler(err, _req, res, _next) {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large" });
  }
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({
    error: err.message || "Server error",
    details: err.details || undefined,
  });
}

export function notFound(_req, res) {
  res.status(404).json({ error: "Not found" });
}
