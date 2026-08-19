// src/lib/pagination.js
// ============================================================
// Pagination & Query Parameter Helper
// Standardizes pagination calculation and metadata response.
// ============================================================

/**
 * Parse standard pagination query params with safe defaults and boundaries.
 * @param {object} query - Express req.query
 * @param {object} [options]
 * @param {number} [options.defaultLimit=20]
 * @param {number} [options.maxLimit=100]
 * @param {string} [options.defaultSortBy='createdAt']
 * @param {string} [options.defaultSortOrder='desc']
 */
export function parsePagination(query = {}, options = {}) {
  const defaultLimit = options.defaultLimit ?? 20;
  const maxLimit = options.maxLimit ?? 100;
  const defaultSortBy = options.defaultSortBy ?? 'createdAt';
  const defaultSortOrder = options.defaultSortOrder ?? 'desc';

  let page = parseInt(query.page, 10);
  if (isNaN(page) || page < 1) page = 1;

  let limit = parseInt(query.limit, 10);
  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const skip = (page - 1) * limit;

  const sortBy = typeof query.sortBy === 'string' && query.sortBy.trim()
    ? query.sortBy.trim()
    : defaultSortBy;

  const sortOrder = query.sortOrder === 'asc' ? 'asc' : defaultSortOrder;

  return {
    page,
    limit,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
    search: typeof query.search === 'string' ? query.search.trim() : '',
  };
}

/**
 * Format standard pagination metadata.
 * @param {number} total - Total count of records
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 */
export function formatPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
