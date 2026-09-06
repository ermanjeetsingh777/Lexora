import { ActivatedRouteSnapshot } from '@angular/router';

export interface ScopedNavContext {
  institutionId?: string;
  branchId?: string;
  libraryId?: string;
  libraryBranchId?: string;
  onInstitutionRoute?: boolean;
}

export function collectRouteParams(route: ActivatedRouteSnapshot): Record<string, string> {
  const params: Record<string, string> = {};
  let snapshot: ActivatedRouteSnapshot | null = route;
  while (snapshot) {
    for (const [key, value] of Object.entries(snapshot.params)) {
      if (value) params[key] = value;
    }
    snapshot = snapshot.parent;
  }
  return params;
}

export function memberCreateLink(ctx: ScopedNavContext): string[] {
  if (ctx.libraryId) {
    return ['/libraries', ctx.libraryId, 'members', 'create'];
  }
  if (ctx.branchId && ctx.onInstitutionRoute && ctx.institutionId) {
    return ['/institutions', ctx.institutionId, 'branches', ctx.branchId, 'members', 'create'];
  }
  if (ctx.branchId) {
    return ['/branches', ctx.branchId, 'members', 'create'];
  }
  if (ctx.institutionId) {
    return ['/institutions', ctx.institutionId, 'members', 'create'];
  }
  return ['/members', 'create'];
}

export function memberDetailLink(memberId: string, ctx: ScopedNavContext): string[] {
  if (ctx.libraryId) {
    return ['/libraries', ctx.libraryId, 'members', memberId];
  }
  if (ctx.branchId && ctx.onInstitutionRoute && ctx.institutionId) {
    return ['/institutions', ctx.institutionId, 'branches', ctx.branchId, 'members', memberId];
  }
  if (ctx.branchId) {
    return ['/branches', ctx.branchId, 'members', memberId];
  }
  if (ctx.institutionId) {
    return ['/institutions', ctx.institutionId, 'members', memberId];
  }
  return ['/members', memberId];
}

/** Query params to open member details on the Attendance report tab. */
export function memberAttendanceReportQuery(opts?: {
  dateFrom?: string | null;
  dateTo?: string | null;
}): { tab: string; dateFrom?: string; dateTo?: string } {
  const q: { tab: string; dateFrom?: string; dateTo?: string } = { tab: 'attendance' };
  if (opts?.dateFrom) q.dateFrom = opts.dateFrom;
  if (opts?.dateTo) q.dateTo = opts.dateTo;
  return q;
}

export function memberEditLink(memberId: string, ctx: ScopedNavContext): string[] {
  if (ctx.libraryId) {
    return ['/libraries', ctx.libraryId, 'members', memberId, 'edit'];
  }
  if (ctx.branchId && ctx.onInstitutionRoute && ctx.institutionId) {
    return ['/institutions', ctx.institutionId, 'branches', ctx.branchId, 'members', memberId, 'edit'];
  }
  if (ctx.branchId) {
    return ['/branches', ctx.branchId, 'members', memberId, 'edit'];
  }
  if (ctx.institutionId) {
    return ['/institutions', ctx.institutionId, 'members', memberId, 'edit'];
  }
  return ['/members', memberId, 'edit'];
}

export function libraryDetailLink(libraryId: string, ctx: ScopedNavContext): string[] {
  const branchId = ctx.libraryBranchId ?? ctx.branchId;
  if (ctx.onInstitutionRoute && ctx.institutionId && branchId) {
    return ['/institutions', ctx.institutionId, 'branches', branchId, 'libraries', libraryId];
  }
  if (branchId) {
    return ['/branches', branchId, 'libraries', libraryId];
  }
  return ['/libraries', libraryId];
}

export interface ScopedBackNav {
  link: string | string[];
  queryParams?: { tab: string };
  label: string;
}

export function memberBackNav(params: Record<string, string>): ScopedBackNav {
  if (params['libraryId']) {
    return {
      link: ['/libraries', params['libraryId']],
      queryParams: { tab: 'members' },
      label: 'Back to library',
    };
  }
  if (params['branchId'] && params['institutionId']) {
    return {
      link: ['/institutions', params['institutionId'], 'branches', params['branchId']],
      queryParams: { tab: 'members' },
      label: 'Back to branch',
    };
  }
  if (params['branchId']) {
    return {
      link: ['/branches', params['branchId']],
      queryParams: { tab: 'members' },
      label: 'Back to branch',
    };
  }
  if (params['institutionId']) {
    return {
      link: ['/institutions', params['institutionId']],
      queryParams: { tab: 'members' },
      label: 'Back to institution',
    };
  }
  return { link: ['/members'], label: 'All members' };
}

export function libraryBackNav(params: Record<string, string>): ScopedBackNav {
  if (params['branchId'] && params['institutionId']) {
    return {
      link: ['/institutions', params['institutionId'], 'branches', params['branchId']],
      queryParams: { tab: 'libraries' },
      label: 'Back to branch',
    };
  }
  if (params['branchId']) {
    return {
      link: ['/branches', params['branchId']],
      queryParams: { tab: 'libraries' },
      label: 'Back to branch',
    };
  }
  if (params['institutionId']) {
    return {
      link: ['/institutions', params['institutionId']],
      queryParams: { tab: 'libraries' },
      label: 'Back to institution',
    };
  }
  return { link: ['/libraries'], label: 'All libraries' };
}

export function memberCreateBackNav(params: Record<string, string>): ScopedBackNav {
  return memberBackNav(params);
}

export function libraryCreateBackNav(params: Record<string, string>): ScopedBackNav {
  return libraryBackNav(params);
}
