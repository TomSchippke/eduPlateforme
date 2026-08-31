import { Session } from "next-auth";

/**
 * Extracts the tenant ID from the session.
 * For PROF: tenantId is their own user ID.
 * For ELEVE: tenantId is their prof's user ID.
 */
export function getTenantId(session: Session): string {
  const tenantId = (session.user as { tenantId?: string })?.tenantId;
  if (!tenantId) {
    throw new Error("No tenant ID in session");
  }
  return tenantId;
}

/**
 * Returns a Prisma filter object for tenant-scoped queries.
 * Use this in all queries that touch tenant-specific data.
 */
export function getTenantFilter(session: Session): { profId: string } {
  return { profId: getTenantId(session) };
}

/**
 * Asserts that a resource belongs to the current tenant.
 * Throws if the profId doesn't match the session's tenantId.
 */
export function assertTenant(profId: string, session: Session): void {
  const tenantId = getTenantId(session);
  if (profId !== tenantId) {
    throw new Error("Access denied: resource does not belong to this tenant");
  }
}

/**
 * Returns the user role from the session.
 */
export function getUserRole(session: Session): string {
  return (session.user as { role?: string })?.role || "";
}

/**
 * Returns the user ID from the session.
 */
export function getUserId(session: Session): string {
  const id = (session.user as { id?: string })?.id;
  if (!id) {
    throw new Error("No user ID in session");
  }
  return id;
}
