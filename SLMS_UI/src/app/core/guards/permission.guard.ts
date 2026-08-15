import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionKey } from '../constants/permissions';

/**
 * Route data: `{ permission: PermissionKey.UsersList }` or `{ permissions: [...], requireAll?: false }`
 */
export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const single = route.data['permission'] as PermissionKey | undefined;
  const many = route.data['permissions'] as PermissionKey[] | undefined;
  const requireAll = route.data['requireAll'] !== false;

  if (single !== undefined) {
    return auth.hasPermission(single) ? true : router.createUrlTree(['/unauthorized']);
  }

  if (many?.length) {
    const allowed = requireAll
      ? many.every((p) => auth.hasPermission(p))
      : many.some((p) => auth.hasPermission(p));
    return allowed ? true : router.createUrlTree(['/unauthorized']);
  }

  return true;
};
