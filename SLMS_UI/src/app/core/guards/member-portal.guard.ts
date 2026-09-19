import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isMemberPortalUser } from '@core/constants/roles';
import { MemberPortalService } from '@core/services/member-portal.service';
import { StorageService } from '@core/services/storage.service';
import { map } from 'rxjs';

function isProfileUrl(url: string): boolean {
  const path = url.split('?')[0];
  return path === '/profile' || path.startsWith('/profile/');
}

function isOwnMemberUrl(url: string, memberId: string): boolean {
  const path = url.split('?')[0];
  return !!memberId && path === `/members/${memberId}`;
}

/** Restricts member-portal users to their own member page + Profile. */
export const memberPortalGuard: CanActivateFn = (_route, state) => {
  const storage = inject(StorageService);
  const router = inject(Router);
  const memberPortal = inject(MemberPortalService);

  const roles = storage.user()?.roles;
  if (!isMemberPortalUser(roles)) {
    return true;
  }

  const mustChangePassword =
    storage.user()?.mustChangePassword === true || state.url.includes('mustChangePassword=1');

  // Profile is always allowed for members (account + password).
  if (isProfileUrl(state.url)) {
    return true;
  }

  // Until password is changed, keep them on Profile (not other app pages).
  if (mustChangePassword) {
    return router.createUrlTree(['/profile'], { queryParams: { mustChangePassword: '1' } });
  }

  const cachedId = memberPortal.memberId();
  if (cachedId && isOwnMemberUrl(state.url, cachedId)) {
    return true;
  }

  if (cachedId) {
    return router.createUrlTree(['/members', cachedId]);
  }

  return memberPortal.resolveMemberId().pipe(
    map((memberId) => {
      if (!memberId) {
        // Still allow Profile even if member record is missing.
        return router.createUrlTree(['/profile']);
      }

      if (isOwnMemberUrl(state.url, memberId)) {
        return true;
      }

      return router.createUrlTree(['/members', memberId]);
    }),
  );
};
