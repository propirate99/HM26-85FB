export function assertProfilePatch(req) {
  const allowed = ["name", "phone", "address"];
  for (const key of Object.keys(req.body || {})) {
    if (!allowed.includes(key)) {
      const err = new Error(`Cannot update ${key}`);
      err.status = 400;
      throw err;
    }
  }
}
