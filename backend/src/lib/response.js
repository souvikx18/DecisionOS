/**
 * Send a successful response
 * @param {import('express').Response} res
 * @param {object} data - Response payload
 * @param {number} statusCode - HTTP status (default 200)
 * @param {string} message - Optional success message
 */
export function sendSuccess(res, data = null, statusCode = 200, message = null, meta = {}) {
  const body = {
    success: true,
    ...(message && { message }),
    ...(data !== null && { data }),
    meta: {
      requestId: res.locals.requestId ?? null,
      timestamp: new Date().toISOString(),
      ...(meta || {}),
    },
  };
  return res.status(statusCode).json(body);
}

/**
 * Send an error response
 * @param {import('express').Response} res
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Machine-readable error code (e.g. INVALID_CREDENTIALS)
 * @param {string} message - Human-readable error message
 * @param {Array} details - Optional validation error details
 */
export function sendError(res, statusCode, code, message, details = []) {
  const body = {
    success: false,
    error: {
      code,
      message,
      ...(details.length > 0 && { details }),
    },
    meta: {
      requestId: res.locals.requestId ?? null,
      timestamp: new Date().toISOString(),
    },
  };
  return res.status(statusCode).json(body);
}

/**
 * Send a validation error (400) from Zod issues
 * @param {import('express').Response} res
 * @param {Array<{ path: (string|number)[], message: string }>} issues
 */
export function sendValidationError(res, issues) {
  const details = issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return sendError(
    res,
    400,
    'VALIDATION_ERROR',
    'Invalid input. Please check the fields below.',
    details
  );
}
