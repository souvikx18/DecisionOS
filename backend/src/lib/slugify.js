// src/lib/slugify.js
// ============================================================
// URL-safe Slug Generator with uniqueness enforcement.
// Converts org names like "Acme Corp!" → "acme-corp"
// Appends counter if slug is taken: "acme-corp-2", "acme-corp-3"
// ============================================================

import { prisma } from './prisma.js';

/**
 * Convert a string to a URL-safe slug.
 * Example: "  Acme Corp!  " → "acme-corp"
 */
export function toSlug(str) {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')                       // Decompose accents (é → e + ́)
    .replace(/[\u0300-\u036f]/g, '')        // Remove accent marks
    .replace(/[^a-z0-9\s-]/g, '')          // Remove non-alphanumeric (keep spaces + hyphens)
    .replace(/\s+/g, '-')                  // Replace spaces with hyphens
    .replace(/-+/g, '-')                   // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '');             // Trim leading/trailing hyphens
}

/**
 * Generate a unique slug for an organization.
 * Checks the database and appends a counter if the slug is taken.
 *
 * @param {string} name - Organization name
 * @param {string} [excludeOrgId] - Exclude this org (for updates)
 * @returns {Promise<string>} - Unique slug
 */
export async function generateUniqueSlug(name, excludeOrgId = null) {
  const baseSlug = toSlug(name) || 'organization';
  let slug = baseSlug;
  let counter = 2;

  // Try until we find a unique slug
  while (true) {
    const existing = await prisma.organization.findFirst({
      where: {
        slug,
        ...(excludeOrgId && { NOT: { id: excludeOrgId } }),
      },
      select: { id: true },
    });

    if (!existing) return slug;  // Slug is available

    // Try with counter: "acme-corp-2", "acme-corp-3" ...
    slug = `${baseSlug}-${counter}`;
    counter++;

    // Safety limit — avoid infinite loops
    if (counter > 100) throw new Error('Unable to generate unique slug');
  }
}
