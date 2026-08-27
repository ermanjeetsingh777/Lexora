export const MEMBER_PORTAL_ROLE = 'Members';

/** Staff / operator roles — users with any of these are not treated as member-portal-only. */
export const STAFF_ROLES = [
  'SuperAdmin',
  'OrganisationAdmin',
  'OrganisationManager',
  'InstitutionAdmin',
  'InstitutionManager',
  'BranchAdmin',
  'BranchManager',
  'LibrarianAdmin',
  'LibrarianManager',
  'Librarians',
  'Teachers',
] as const;

export function isMemberPortalUser(roles: readonly string[] | null | undefined): boolean {
  if (!roles?.length) {
    return false;
  }

  if (!roles.includes(MEMBER_PORTAL_ROLE)) {
    return false;
  }

  return !roles.some((role) => (STAFF_ROLES as readonly string[]).includes(role));
}
