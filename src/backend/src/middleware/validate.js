export function validate(schemaFn) {
  return (req, res, next) => {
    try {
      schemaFn(req);
      next();
    } catch (err) {
      err.status = err.status || 400;
      next(err);
    }
  };
}
