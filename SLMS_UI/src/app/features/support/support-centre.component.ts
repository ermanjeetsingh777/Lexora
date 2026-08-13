import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideActivity, LucideAlertCircle, LucideBookOpen, LucideCheckCircle2, LucideChevronRight,
  LucideClock, LucideExternalLink, LucideFileText, LucideLifeBuoy, LucideMail,
  LucideMessageSquare, LucidePaperclip, LucidePhone, LucidePlus, LucideSave, LucideSearch,
  LucideSend, LucideShieldAlert, LucideSparkles, LucideTrash2, LucideVideo, LucideX, LucideZap,
} from '@lucide/angular';
import { ToastService } from '@core/services/toast.service';
import {
  KnowledgeBaseArticle, SupportTicketDetail, SupportTicketListItem, SystemStatus,
  TicketCategory, TicketDraft, TicketPriority, TicketStatus,
  TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES,
  ticketCategoryLabel, ticketPriorityLabel, ticketStatusLabel,
} from '@core/models/support.models';
import { ButtonComponent } from '@shared/components/button/button.component';
import { GlassCardComponent, PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { SidebarService } from '../../layouts/sidebar/sidebar.service';
import { deleteTicketDraft, loadTicketDrafts } from './support-draft.store';
import {
  formatBytes, formatRelative, formatSupportDate, priorityTone, slaState, statusIconClass, supportInitials,
} from './support-format.util';
import { highlightText, scoreMatch, snippet, tokenize } from './support-highlight.util';
import { NewTicketDialogComponent, NewTicketSubmitPayload } from './components/new-ticket-dialog/new-ticket-dialog.component';
import { SupportService } from './support.service';

type SupportTab = 'tickets' | 'kb' | 'contact' | 'status';
type DrawerTab = 'thread' | 'notes' | 'activity';

@Component({
  selector: 'app-support-centre',
  imports: [
    DecimalPipe, FormsModule, RouterLink,
    ButtonComponent, PageHeaderComponent, GlassCardComponent, StatusBadgeComponent, NewTicketDialogComponent,
    LucideLifeBuoy, LucidePlus, LucideSearch, LucideAlertCircle, LucideClock, LucideCheckCircle2,
    LucideChevronRight, LucideMessageSquare, LucideMail, LucidePhone, LucideVideo, LucidePaperclip,
    LucideSend, LucideTrash2, LucideX, LucideSave, LucideFileText, LucideBookOpen,
    LucideSparkles, LucideShieldAlert, LucideActivity, LucideZap, LucideExternalLink,
  ],
  providers: [SupportService],
  templateUrl: './support-centre.component.html',
  styleUrl: './support-centre.component.css',
})
export class SupportCentreComponent implements OnInit {
  private readonly supportService = inject(SupportService);
  private readonly toast = inject(ToastService);
  protected readonly sidebar = inject(SidebarService);

  readonly TICKET_CATEGORIES = TICKET_CATEGORIES;
  readonly TICKET_PRIORITIES = TICKET_PRIORITIES;
  readonly TICKET_STATUSES = TICKET_STATUSES;
  readonly ticketStatusLabel = ticketStatusLabel;
  readonly ticketPriorityLabel = ticketPriorityLabel;
  readonly ticketCategoryLabel = ticketCategoryLabel;
  readonly formatRelative = formatRelative;
  readonly formatBytes = formatBytes;
  readonly formatSupportDate = formatSupportDate;
  readonly supportInitials = supportInitials;
  readonly priorityTone = priorityTone;
  readonly statusIconClass = statusIconClass;
  readonly slaState = slaState;
  readonly TicketStatus = TicketStatus;

  readonly assistantSuggestions = ['Refund flow', 'QR pairing', 'Bulk import', 'Shift rules'];
  readonly contactChannels = [
    { icon: 'message', label: 'Live chat', meta: 'Avg reply · 2 min', hint: 'Mon–Sat, 8am–10pm' },
    { icon: 'mail', label: 'Email support', meta: 'support@smartlibrary.io', hint: 'Reply within 4 hrs' },
    { icon: 'phone', label: 'Phone (Pro plans)', meta: '+1 (415) 555-0119', hint: '24×7 incident line' },
    { icon: 'video', label: 'Book a specialist', meta: '30-min screen-share', hint: 'Onboarding & migrations' },
  ];

  readonly activeTab = signal<SupportTab>('tickets');
  readonly loading = signal(true);
  readonly tickets = signal<SupportTicketListItem[]>([]);
  readonly statusData = signal<SystemStatus | null>(null);
  readonly drafts = signal<TicketDraft[]>(loadTicketDrafts());

  readonly ticketSearch = signal('');
  readonly statusFilter = signal<'all' | TicketStatus>('all');
  readonly priorityFilter = signal<'all' | TicketPriority>('all');
  readonly categoryFilter = signal<'all' | TicketCategory>('all');

  readonly showNewTicket = signal(false);
  readonly newTicketInitialDraft = signal<TicketDraft | undefined>(undefined);
  readonly selectedTicket = signal<SupportTicketDetail | null>(null);
  readonly drawerOpen = signal(false);
  readonly drawerTab = signal<DrawerTab>('thread');
  readonly drawerReply = signal('');
  readonly drawerBusy = signal(false);

  readonly createBusy = signal(false);

  readonly kbQuery = signal('');
  readonly kbCategory = signal('all');
  readonly articles = signal<KnowledgeBaseArticle[]>([]);
  readonly kbLoading = signal(false);
  readonly selectedArticle = signal<KnowledgeBaseArticle | null>(null);
  readonly assistantQuery = signal('');

  readonly filteredTickets = computed(() => {
    const q = this.ticketSearch().trim().toLowerCase();
    return this.tickets().filter(t => {
      if (this.statusFilter() !== 'all' && t.status !== this.statusFilter()) return false;
      if (this.priorityFilter() !== 'all' && t.priority !== this.priorityFilter()) return false;
      if (this.categoryFilter() !== 'all' && t.category !== this.categoryFilter()) return false;
      if (!q) return true;
      return t.subject.toLowerCase().includes(q)
        || t.id.toLowerCase().includes(q)
        || (t.ownerName ?? '').toLowerCase().includes(q)
        || t.requesterName.toLowerCase().includes(q);
    });
  });

  readonly ticketKpis = computed(() => {
    const list = this.tickets();
    const status = this.statusData();
    const activeIncidents = status?.activeIncidents.length ?? 0;
    const overallHealthy = status?.components.every(c => c.status === 'Operational') ?? true;
    return {
      open: list.filter(t => t.status === TicketStatus.Open).length,
      pending: list.filter(t => t.status === TicketStatus.InProgress || t.status === TicketStatus.Waiting).length,
      resolved: list.filter(t => t.status === TicketStatus.Resolved).length,
      systemLabel: overallHealthy ? 'All good' : 'Degraded',
      systemHint: overallHealthy ? 'All services operational' : `${activeIncidents} incident(s)`,
      systemTone: overallHealthy ? 'text-emerald-500' : 'text-amber-500',
    };
  });

  readonly activeIncidents = computed(() => this.statusData()?.activeIncidents ?? []);
  readonly overallHealthy = computed(() =>
    (this.statusData()?.components ?? []).every(c => c.status === 'Operational')
  );

  readonly kbCategories = computed(() => {
    const set = new Set(this.articles().map(a => a.category));
    return ['all', ...Array.from(set).sort()];
  });

  readonly filteredArticles = computed(() => {
    const tokens = tokenize(this.kbQuery());
    const category = this.kbCategory();
    return this.articles()
      .filter(a => category === 'all' || a.category === category)
      .map(a => ({
        article: a,
        score: scoreMatch(`${a.title} ${a.body} ${a.tags.join(' ')}`, tokens),
        preview: snippet(a.body, tokens),
      }))
      .filter(row => !tokens.length || row.score > 0)
      .sort((a, b) => (tokens.length ? b.score - a.score : b.article.viewCount - a.article.viewCount));
  });

  readonly popularArticles = computed(() =>
    [...this.articles()].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5)
  );

  readonly overlayLeft = computed(() => {
    if (this.sidebar.isMobile()) return '0';
    if (this.sidebar.isTablet()) return '4rem';
    return this.sidebar.collapsed() ? '4rem' : '16rem';
  });

  readonly relatedArticles = computed(() => {
    const article = this.selectedArticle();
    if (!article) return [];
    return this.articles()
      .filter(a => a.id !== article.id)
      .map(a => ({
        article: a,
        score: (a.category === article.category ? 3 : 0) + a.tags.filter(t => article.tags.includes(t)).length * 2,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(x => x.article);
  });

  ngOnInit(): void {
    this.refreshTickets();
    this.refreshStatus();
    this.loadArticles();
  }

  setTab(tab: SupportTab): void {
    this.activeTab.set(tab);
    if (tab === 'kb' && !this.articles().length) this.loadArticles();
    if (tab === 'status') this.refreshStatus();
  }

  refreshTickets(): void {
    this.loading.set(true);
    this.supportService.getTickets().subscribe({
      next: (res) => {
        this.tickets.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.tickets.set([]);
        this.loading.set(false);
        this.toast.error('Failed to load tickets');
      },
    });
  }

  refreshStatus(): void {
    this.supportService.getStatus().subscribe({
      next: (res) => this.statusData.set(res.data ?? null),
    });
  }

  loadArticles(): void {
    this.kbLoading.set(true);
    this.supportService.searchArticles().subscribe({
      next: (res) => {
        this.articles.set(res.data ?? []);
        this.kbLoading.set(false);
      },
      error: () => {
        this.articles.set([]);
        this.kbLoading.set(false);
      },
    });
  }

  ticketShortId(id: string): string {
    return `#${id.slice(0, 8).toUpperCase()}`;
  }

  uptimePercent(values: number[]): string {
    if (!values.length) return '100.00';
    return ((values.reduce((a, b) => a + b, 0) / values.length) * 100).toFixed(2);
  }

  openNewTicket(draft?: TicketDraft): void {
    this.newTicketInitialDraft.set(draft);
    this.showNewTicket.set(true);
  }

  closeNewTicket(): void {
    this.showNewTicket.set(false);
    this.newTicketInitialDraft.set(undefined);
  }

  refreshDrafts(): void {
    this.drafts.set(loadTicketDrafts());
  }

  onTicketSubmitted(payload: NewTicketSubmitPayload): void {
    this.createBusy.set(true);
    this.supportService.createTicket({
      subject: payload.subject,
      category: payload.category,
      priority: payload.priority,
      area: payload.area,
      description: payload.description,
      attachmentIds: payload.attachmentIds,
    }).subscribe({
      next: (res) => {
        this.createBusy.set(false);
        this.showNewTicket.set(false);
        this.newTicketInitialDraft.set(undefined);
        this.drafts.set(deleteTicketDraft(payload.draftId));
        this.toast.success('Ticket submitted');
        this.refreshTickets();
        if (res.data) this.openTicketDrawer(res.data.id);
      },
      error: (err) => {
        this.createBusy.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to create ticket');
      },
    });
  }

  removeDraft(id: string): void {
    this.drafts.set(deleteTicketDraft(id));
    this.toast.success('Draft deleted');
  }

  openTicketDrawer(ticketId: string): void {
    this.supportService.getTicket(ticketId).subscribe({
      next: (res) => {
        this.selectedTicket.set(res.data ?? null);
        this.drawerOpen.set(true);
        this.drawerTab.set('thread');
        this.drawerReply.set('');
      },
      error: () => this.toast.error('Failed to load ticket'),
    });
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.selectedTicket.set(null);
  }

  sendReply(): void {
    const ticket = this.selectedTicket();
    const body = this.drawerReply().trim();
    if (!ticket || !body) return;
    this.drawerBusy.set(true);
    this.supportService.addMessage(ticket.id, { body }).subscribe({
      next: (res) => {
        this.drawerBusy.set(false);
        this.drawerReply.set('');
        this.selectedTicket.set(res.data ?? ticket);
        this.refreshTickets();
        this.toast.success('Reply sent');
      },
      error: () => {
        this.drawerBusy.set(false);
        this.toast.error('Failed to send reply');
      },
    });
  }

  updateTicketStatus(status: TicketStatus): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;
    this.supportService.updateStatus(ticket.id, { status }).subscribe({
      next: (res) => {
        this.selectedTicket.set(res.data ?? ticket);
        this.refreshTickets();
        this.toast.success('Ticket updated');
      },
      error: () => this.toast.error('Failed to update ticket'),
    });
  }

  openArticle(article: KnowledgeBaseArticle): void {
    this.supportService.getArticle(article.id).subscribe({
      next: (res) => this.selectedArticle.set(res.data ?? article),
    });
  }

  kbHighlight(text: string): string {
    return highlightText(text, tokenize(this.kbQuery()));
  }
}
