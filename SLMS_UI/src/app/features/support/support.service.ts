import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { APIResponseModel } from '@core/models/APIResponseModel';
import {
  AddTicketMessageRequest,
  CreateSupportTicketRequest,
  KnowledgeBaseArticle,
  SupportAttachment,
  SupportContext,
  SupportTicketDetail,
  SupportTicketListItem,
  SystemIncident,
  SystemStatus,
  UpdateTicketStatusRequest,
} from '@core/models/support.models';
import { Observable } from 'rxjs';

@Injectable()
export class SupportService {
  private readonly api = inject(ApiService);

  getContext(): Observable<APIResponseModel<SupportContext>> {
    return this.api.get<SupportContext>('support/context');
  }

  getTickets(): Observable<APIResponseModel<SupportTicketListItem[]>> {
    return this.api.get<SupportTicketListItem[]>('support/tickets');
  }

  getTicket(id: string): Observable<APIResponseModel<SupportTicketDetail>> {
    return this.api.getById<SupportTicketDetail>('support/tickets', id);
  }

  createTicket(body: CreateSupportTicketRequest): Observable<APIResponseModel<SupportTicketDetail>> {
    return this.api.post<SupportTicketDetail>('support/tickets', body);
  }

  addMessage(ticketId: string, body: AddTicketMessageRequest): Observable<APIResponseModel<SupportTicketDetail>> {
    return this.api.post<SupportTicketDetail>(`support/tickets/${ticketId}/messages`, body);
  }

  updateStatus(ticketId: string, body: UpdateTicketStatusRequest): Observable<APIResponseModel<SupportTicketDetail>> {
    return this.api.patch<SupportTicketDetail>(`support/tickets/${ticketId}/status`, body);
  }

  uploadAttachment(file: File): Observable<APIResponseModel<SupportAttachment>> {
    return this.api.upload<SupportAttachment>('support/attachments', file);
  }

  downloadAttachment(attachmentId: string): Observable<Blob> {
    return this.api.download(`support/attachments/${attachmentId}/download`);
  }

  searchArticles(q?: string, category?: string): Observable<APIResponseModel<KnowledgeBaseArticle[]>> {
    return this.api.get<KnowledgeBaseArticle[]>('support/articles', { params: { q, category } });
  }

  getArticle(id: string): Observable<APIResponseModel<KnowledgeBaseArticle>> {
    return this.api.getById<KnowledgeBaseArticle>('support/articles', id);
  }

  getStatus(): Observable<APIResponseModel<SystemStatus>> {
    return this.api.get<SystemStatus>('support/status');
  }

  simulateIncident(): Observable<APIResponseModel<SystemIncident>> {
    return this.api.post<SystemIncident>('support/status/simulate-incident', {});
  }
}
