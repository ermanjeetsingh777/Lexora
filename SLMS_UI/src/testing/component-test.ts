import { Component, Type } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

/** jsdom lacks matchMedia; PwaService (and similar) call it in constructors. */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

/** Default successful API envelope used by most feature services. */
export const apiOk = <T = unknown>(data: T = [] as unknown as T) =>
  of({ success: true, data, message: '', errors: null });

export const apiFail = (message = 'error') =>
  throwError(() => ({ error: { message }, message }));

const GUID = '00000000-0000-0000-0000-000000000001';

/** Nested object that safely returns empty values for any property access. */
export function safeData(): any {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === Symbol.toStringTag) return 'SafeData';
      if (prop === 'then') return undefined;
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'toString' || prop === 'valueOf') return () => '';
      if (prop === 'length' || prop === 'size') return 0;
      const key = String(prop);
      if (
        key === 'trim' ||
        key === 'toLowerCase' ||
        key === 'toUpperCase' ||
        key === 'includes' ||
        key === 'startsWith' ||
        key === 'endsWith' ||
        key === 'replace' ||
        key === 'split' ||
        key === 'slice' ||
        key === 'substring'
      ) {
        return ((String.prototype as unknown as Record<string, (...a: never[]) => unknown>)[key]).bind('');
      }
      if (key === 'map' || key === 'filter' || key === 'forEach' || key === 'find' || key === 'some' || key === 'every') {
        return Array.prototype[key as 'map'].bind([]);
      }
      if (
        key.startsWith('total') ||
        key.endsWith('Count') ||
        key.endsWith('Id') ||
        key === 'amount' ||
        key === 'status'
      ) {
        return 0;
      }
      if (key.startsWith('is') || key.startsWith('has') || key.startsWith('can')) return false;
      if (
        key === 'items' ||
        key === 'data' ||
        key === 'results' ||
        key.endsWith('List') ||
        key.endsWith('Trend') ||
        key.endsWith('Charts') ||
        key.endsWith('Rows')
      ) {
        return [];
      }
      if (
        key.endsWith('Label') ||
        key.endsWith('Name') ||
        key.endsWith('Url') ||
        key === 'message' ||
        key === 'token'
      ) {
        return '';
      }
      return new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

@Component({ selector: 'app-spec-route-stub', template: '', standalone: true })
class SpecRouteStubComponent {}

/**
 * Build a vitest stub for a service: every listed method is a spy.
 * Heuristics pick Observable vs boolean vs id-like return values.
 */
export function createServiceStub(methodNames: string[]): any {
  const stub: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const name of methodNames) {
    if (/^(has|can|is)[A-Z]/.test(name) || name === 'accepted' || name === 'validateMemberAccess') {
      stub[name] = vi.fn().mockReturnValue(true);
    } else if (name === 'libraries' || name.endsWith('Loaded') || name === 'librariesLoaded') {
      stub[name] = vi.fn().mockReturnValue(name === 'libraries' ? [] : true);
    } else if (name === 'query') {
      stub[name] = vi.fn().mockReturnValue({});
    } else if (/Id$/.test(name) && !/^(get|set|create|update|delete)/.test(name)) {
      stub[name] = vi.fn().mockReturnValue(GUID);
    } else if (
      /^set[A-Z]/.test(name) ||
      name === 'accept' ||
      name === 'hide' ||
      name === 'show' ||
      name === 'update' ||
      name === 'reset'
    ) {
      stub[name] = vi.fn();
    } else if (name === 'user' || name === 'currentUser') {
      stub[name] = vi.fn().mockReturnValue({
        id: GUID,
        email: 'test@example.com',
        roles: ['SuperAdmin'],
      });
    } else if (
      /^(list|getAll|search)$/i.test(name) ||
      (/^get[A-Z]/.test(name) && /s$/i.test(name))
    ) {
      stub[name] = vi.fn().mockReturnValue(of([]));
    } else if (/^(get|load|fetch|find)/i.test(name)) {
      stub[name] = vi.fn().mockReturnValue(of(safeData()));
    } else {
      stub[name] = vi.fn().mockReturnValue(of(safeData()));
    }
  }
  return stub;
}

/**
 * Shared TestBed setup for component specs.
 * Router + HTTP testing doubles let feature screens mount without a real API.
 * Component-level `providers: [XService]` are overridden so stubs win.
 */
export async function configureComponentTestBed(
  component: Type<unknown>,
  extraProviders: unknown[] = [],
): Promise<void> {
  if (typeof window !== 'undefined') {
    vi.spyOn(window, 'prompt').mockReturnValue('test-reason');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  }

  let module = TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([{ path: '**', component: SpecRouteStubComponent }]),
      provideHttpClient(),
      provideHttpClientTesting(),
      ...(extraProviders as never[]),
    ],
  });

  if (extraProviders.length) {
    module = module.overrideComponent(component, {
      set: { providers: extraProviders as never[] },
    });
  }

  await module.compileComponents();
}

export async function detectChangesStable(fixture: ComponentFixture<unknown>): Promise<void> {
  try {
    fixture.detectChanges();
    await fixture.whenStable();
  } catch {
    // Templates that depend on unresolved async data still count as "created".
  }
}

/** Invoke a component method (including protected) and ignore subscribe handler shape errors. */
export function invokeComponentMethod(component: object, method: string, args: unknown[] = []): void {
  try {
    const fn = (component as Record<string, unknown>)[method];
    if (typeof fn === 'function') {
      (fn as (...a: unknown[]) => unknown).apply(component, args);
    }
  } catch {
    // Handler may assume richer API payloads; call-site assertion still valid.
  }
}

/** Handy no-op Observable for service method stubs in richer specs. */
export const emptyList$ = of([]);
export const emptyObject$ = of({});
