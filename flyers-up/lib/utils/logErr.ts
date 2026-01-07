/**
 * Safe error logger that produces meaningful output for unknown error shapes.
 * Avoids the common "console.error(label, {})" problem.
 */
export function logErr(label: string, err: unknown) {
  if (err instanceof Error) {
    console.error(label, { message: err.message, name: err.name, stack: err.stack });
    return;
  }
  try {
    console.error(label, JSON.stringify(err, Object.getOwnPropertyNames(err as object)));
  } catch {
    console.error(label, err);
  }
}




