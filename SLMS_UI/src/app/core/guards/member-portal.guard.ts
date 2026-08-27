import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isMemberPortalUser } from '@core/constants/roles';
import { MemberPortalService } from '@core/services/member-portal.service';
import { StorageService } from '@core/services/storage.service';
import { map } from 'rxjs';

function isAllowedMemberPortalUrl(url: string, memberId: string): boolean {
  const path = url.split('?')[0];
  if (path === `/members/${memberId}`) {
    return true;
  }

  return false;
}

/** Restricts member-portal users to their own member details page. */
export const memberPortalGuard: CanActivateFn = (_route, state) => {
  const storage = inject(StorageService);
  const router = inject(Router);
  const memberPortal = inject(MemberPortalService);

  const roles = storage.user()?.roles;
  if (!isMemberPortalUser(roles)) {
    return true;
  }

  const cachedId = memberPortal.memberId();
  if (cachedId && isAllowedMemberPortalUrl(state.url, cachedId)) {
    return true;
  }

  if (cachedId) {
    return router.createUrlTree(['/members', cachedId]);
  }

  return memberPortal.resolveMemberId().pipe(
    map((memberId) =>
      memberId
        ? isAllowedMemberPortalUrl(state.url, memberId)
          ? true
          : router.createUrlTree(['/members', memberId])
        : router.createUrlTree(['/unauthorized']),
    ),
  );
};
