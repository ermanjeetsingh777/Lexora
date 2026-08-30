import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAlertCircle,
  LucideArrowUpRight,
  LucideCrown,
  LucideSparkles,
} from '@lucide/angular';
import { OrganizationEntitlementService, ResourceQuotaDetails } from '@core/services/organization-entitlement.service';

export type QuotaDisplayVariant = 'banner' | 'pill';

@Component({
  selector: 'app-quota-badge',
  standalone: true,
  imports: [
    RouterLink,
    LucideCrown,
    LucideSparkles,
    LucideAlertCircle,
    LucideArrowUpRight,
  ],
  template: `
    @if (quota(); as q) {
      @if (variant() === 'pill') {
        <!-- Clean, modern pill in header action bar -->
        <div
          class="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm shadow-xs transition-colors"
          [class.border-amber-500/40]="!q.isSuperAdmin && q.remaining === 0"
          [class.bg-amber-500/5]="!q.isSuperAdmin && q.remaining === 0"
        >
          @if (q.isSuperAdmin) {
            <svg lucideCrown class="h-3.5 w-3.5 text-purple-500 shrink-0"></svg>
            <span class="text-muted-foreground font-normal">Plan:</span>
            <span class="font-semibold text-purple-600 dark:text-purple-400">SuperAdmin (Unlimited)</span>
          } @else {
            <span class="inline-flex items-center gap-1.5">
              <span
                class="h-1.5 w-1.5 rounded-full shrink-0"
                [class.bg-emerald-500]="q.remaining > 0"
                [class.bg-amber-500]="q.remaining === 0"
              ></span>
              <span class="tabular-nums font-semibold">{{ q.count }}</span>
              <span class="text-muted-foreground">/ {{ q.max }}</span>
              <span class="text-muted-foreground">{{ q.resourceLabel }}</span>
            </span>

            <span class="text-border">|</span>

            @if (q.remaining > 0) {
              <span class="text-emerald-600 dark:text-emerald-400 font-medium">
                {{ q.remaining }} can create
              </span>
            } @else {
              <span class="text-amber-600 dark:text-amber-400 font-semibold">
                Limit reached
              </span>
              @if (showUpgradeButton()) {
                <a
                  routerLink="/subscriptions"
                  class="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline ml-0.5"
                  title="Manage plan or add capacity in Subscriptions"
                >
                  Add more <svg lucideArrowUpRight class="h-3 w-3"></svg>
                </a>
              }
            }
          }
        </div>
      } @else if (variant() === 'banner') {
        <!-- Clean, subtle glass banner without harsh background colors -->
        <div
          class="relative overflow-hidden rounded-xl border border-border/70 bg-card/60 p-3.5 mb-4 backdrop-blur-md shadow-xs transition-all"
          [class.border-amber-500/40]="!q.isSuperAdmin && q.remaining === 0"
          [class.bg-amber-500/5]="!q.isSuperAdmin && q.remaining === 0"
        >
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/50 text-foreground"
                [class.text-purple-600]="q.isSuperAdmin"
                [class.text-amber-600]="!q.isSuperAdmin && q.remaining === 0"
                [class.text-primary]="!q.isSuperAdmin && q.remaining > 0"
              >
                @if (q.isSuperAdmin) {
                  <svg lucideCrown class="h-4 w-4 text-purple-600 dark:text-purple-400"></svg>
                } @else if (q.remaining === 0) {
                  <svg lucideAlertCircle class="h-4 w-4 text-amber-600 dark:text-amber-400"></svg>
                } @else {
                  <svg lucideSparkles class="h-4 w-4 text-primary"></svg>
                }
              </div>

              <div class="min-w-0 text-xs">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-foreground uppercase tracking-wide text-[11px]">
                    {{ q.resourceLabel }} Capacity
                  </span>
                  <span class="rounded border border-border/60 bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground uppercase">
                    {{ q.packageTier }} Plan
                  </span>
                </div>
                <p class="text-muted-foreground mt-0.5">
                  @if (q.isSuperAdmin) {
                    <span>Using <strong class="text-foreground">{{ q.count }}</strong> {{ q.resourceLabel.toLowerCase() }}. Unlimited quota.</span>
                  } @else {
                    <span>
                      Using <strong class="text-foreground">{{ q.count }}</strong> of <strong class="text-foreground">{{ q.max }}</strong>.
                      @if (q.remaining > 0) {
                        <span class="text-emerald-600 dark:text-emerald-400 font-medium"> ({{ q.remaining }} remaining)</span>
                      } @else {
                        <span class="text-amber-600 dark:text-amber-400 font-medium"> (0 remaining)</span>
                      }
                    </span>
                  }
                </p>
              </div>
            </div>

            @if (!q.isSuperAdmin && showUpgradeButton()) {
              <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <a
                  routerLink="/subscriptions"
                  class="inline-flex items-center gap-1 rounded-md border border-border/80 bg-background/90 hover:bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition shadow-xs"
                >
                  @if (q.remaining === 0) {
                    <span class="text-amber-600 dark:text-amber-400 font-semibold">Add Capacity</span>
                  } @else {
                    <span>Manage Plan</span>
                  }
                  <svg lucideArrowUpRight class="h-3 w-3"></svg>
                </a>
              </div>
            }
          </div>
        </div>
      }
    }
  `,
})
export class QuotaBadgeComponent {
  private readonly entitlementsService = inject(OrganizationEntitlementService);

  readonly resourceType = input.required<'institution' | 'branch' | 'library' | 'user' | 'member'>();
  readonly variant = input<QuotaDisplayVariant>('pill');
  readonly showUpgradeButton = input<boolean>(true);

  readonly quota = computed<ResourceQuotaDetails | null>(() => {
    const rType = this.resourceType();
    switch (rType) {
      case 'institution':
        return this.entitlementsService.institutionQuota();
      case 'branch':
        return this.entitlementsService.branchQuota();
      case 'library':
        return this.entitlementsService.libraryQuota();
      case 'user':
        return this.entitlementsService.userQuota();
      case 'member':
        return this.entitlementsService.memberQuota();
      default:
        return null;
    }
  });
}
