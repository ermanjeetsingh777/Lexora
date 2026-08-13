import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideFileText, LucideLifeBuoy, LucidePaperclip, LucideSave, LucideSend, LucideX,
} from '@lucide/angular';
import { ToastService } from '@core/services/toast.service';
import {
  TICKET_CATEGORIES, TICKET_PRIORITIES, TicketCategory, TicketDraft, TicketPriority,
} from '@core/models/support.models';
import { ButtonComponent } from '@shared/components/button/button.component';
import {
  createDraftId, upsertTicketDraft,
} from '../../support-draft.store';
import { formatBytes } from '../../support-format.util';
import { SupportService } from '../../support.service';

export interface NewTicketSubmitPayload {
  draftId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  area?: string;
  description: string;
  attachmentIds: string[];
}

@Component({
  selector: 'app-new-ticket-dialog',
  imports: [
    FormsModule, ButtonComponent,
    LucideLifeBuoy, LucideX, LucidePaperclip, LucideFileText, LucideSave, LucideSend,
  ],
  templateUrl: './new-ticket-dialog.component.html',
})
export class NewTicketDialogComponent {
  private readonly supportService = inject(SupportService);
  private readonly toast = inject(ToastService);

  readonly open = input(false);
  readonly initialDraft = input<TicketDraft | undefined>();
  readonly busy = input(false);

  readonly submitted = output<NewTicketSubmitPayload>();
  readonly draftSaved = output<void>();
  readonly closed = output<void>();

  readonly TICKET_CATEGORIES = TICKET_CATEGORIES;
  readonly TICKET_PRIORITIES = TICKET_PRIORITIES;

  readonly draftId = signal(createDraftId());
  readonly subject = signal('');
  readonly category = signal(TicketCategory.Technical);
  readonly priority = signal(TicketPriority.Normal);
  readonly area = signal('');
  readonly description = signal('');
  readonly attachmentIds = signal<string[]>([]);
  readonly attachmentNames = signal<string[]>([]);
  readonly attachmentSizes = signal<number[]>([]);
  readonly attachmentDragOver = signal(false);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const draft = this.initialDraft();
      this.draftId.set(draft?.id ?? createDraftId());
      this.subject.set(draft?.subject ?? '');
      this.category.set(draft?.category ?? TicketCategory.Technical);
      this.priority.set(draft?.priority ?? TicketPriority.Normal);
      this.area.set(draft?.area ?? '');
      this.description.set(draft?.description ?? '');
      this.attachmentIds.set(draft?.attachmentIds ?? []);
      this.attachmentNames.set(draft?.attachmentNames ?? []);
      this.attachmentSizes.set([]);
      this.attachmentDragOver.set(false);
    });
  }

  readonly formatBytes = formatBytes;

  onClose(): void {
    this.closed.emit();
  }

  onSaveDraftAndClose(): void {
    if (this.subject().trim() || this.description().trim()) {
      this.persistDraft(false);
      this.toast.success('Draft saved — find it under Saved drafts.');
      this.draftSaved.emit();
    }
    this.onClose();
  }

  persistDraft(showToast = true): void {
    if (!this.subject().trim() && !this.description().trim()) return;
    upsertTicketDraft({
      id: this.draftId(),
      subject: this.subject(),
      category: this.category(),
      priority: this.priority(),
      area: this.area(),
      description: this.description(),
      attachmentIds: this.attachmentIds(),
      attachmentNames: this.attachmentNames(),
      updatedAt: Date.now(),
    });
    if (showToast) this.toast.success('Draft saved');
    this.draftSaved.emit();
  }

  removeAttachment(index: number): void {
    this.attachmentIds.update(ids => ids.filter((_, i) => i !== index));
    this.attachmentNames.update(names => names.filter((_, i) => i !== index));
    this.attachmentSizes.update(sizes => sizes.filter((_, i) => i !== index));
    this.persistDraft(false);
  }

  onAttachmentDragOver(event: DragEvent): void {
    event.preventDefault();
    this.attachmentDragOver.set(true);
  }

  onAttachmentDragLeave(): void {
    this.attachmentDragOver.set(false);
  }

  onAttachmentDrop(event: DragEvent): void {
    event.preventDefault();
    this.attachmentDragOver.set(false);
    this.uploadFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  onSubmit(): void {
    if (!this.subject().trim() || !this.description().trim()) {
      this.toast.error('Subject and description are required');
      return;
    }
    this.submitted.emit({
      draftId: this.draftId(),
      subject: this.subject().trim(),
      category: this.category(),
      priority: this.priority(),
      area: this.area().trim() || undefined,
      description: this.description().trim(),
      attachmentIds: this.attachmentIds(),
    });
  }

  private uploadFiles(files: File[]): void {
    if (!files.length) return;
    for (const file of files.slice(0, 5 - this.attachmentIds().length)) {
      this.supportService.uploadAttachment(file).subscribe({
        next: (res) => {
          if (!res.data) return;
          this.attachmentIds.update(ids => [...ids, res.data!.id]);
          this.attachmentNames.update(names => [...names, res.data!.fileName]);
          this.attachmentSizes.update(sizes => [...sizes, res.data!.sizeBytes]);
          this.persistDraft(false);
        },
        error: () => this.toast.error(`Failed to upload ${file.name}`),
      });
    }
  }
}
