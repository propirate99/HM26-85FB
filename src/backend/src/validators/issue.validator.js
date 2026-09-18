export function assertIssueBody(req) {
  const { description, categoryId } = req.body || {};
  if (!categoryId) {
    const err = new Error("categoryId is required");
    err.status = 400;
    throw err;
  }
  if (description && String(description).length > 4000) {
    const err = new Error("description is too long");
    err.status = 400;
    throw err;
  }
}
