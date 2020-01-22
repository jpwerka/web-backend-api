import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IOutboundDocument } from '../../entities/outbound-document/outbound-document.interface';

@Injectable()
export class OutboundDocumentService {

  private url = 'http://localhost:8080/api/documents/outbound';

  constructor(private http: HttpClient) {}

  getAll(params?: HttpParams | { [param: string]: string | string[]; }): Observable<IOutboundDocument[]> {
    return this.http.get<IOutboundDocument[]>(this.url, { params });
  }

  getAllUnloaded(): Observable<IOutboundDocument[]> {
    return this.http.get<IOutboundDocument[]>(`${this.url}/unloaded`);
  }

  getById(id: number): Observable<IOutboundDocument> {
    return this.http.get<IOutboundDocument>(`${this.url}/${id}`);
  }

  getIdentifier(): Observable<{identifier: string}> {
    return this.http.post<{identifier: string}>(`${this.url}/identifier`, null);
  }

  create(document: IOutboundDocument): Observable<IOutboundDocument> {
    return this.http.post<IOutboundDocument>(this.url, document);
  }

  update(document: IOutboundDocument): Observable<IOutboundDocument> {
    return this.http.put<IOutboundDocument>(`${this.url}/${document.id}`, document);
  }

  updateWithPost(document: IOutboundDocument): Observable<IOutboundDocument> {
    return this.http.post<IOutboundDocument>(`${this.url}/${document.id}`, document);
  }

  updateWithPostUrl(document: IOutboundDocument): Observable<IOutboundDocument> {
    return this.http.post<IOutboundDocument>(`${this.url}/${document.id}/alterar`, document);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
