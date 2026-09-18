export function assertEvidenceMeta(req) {
  if (!req.file) {
    const err = new Error("Image file is required");
    err.status = 400;
    throw err;
  }
}
