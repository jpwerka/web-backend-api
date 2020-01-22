import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IOutboundLoad } from '../../entities/outbound-load/outbound-load.interface';
import { IOutboundDocument } from '../../entities/outbound-document/outbound-document.interface';

@Injectable()
export class OutboundLoadService {

  private url = 'http://localhost:8080/api/loads/outbound';

  constructor(private http: HttpClient) {}

  getAll(params?: HttpParams | { [param: string]: string | string[]; }): Observable<IOutboundLoad[]> {
    return this.http.get<IOutboundLoad[]>(this.url, { params });
  }

  getById(id: number): Observable<IOutboundLoad> {
    return this.http.get<IOutboundLoad>(`${this.url}/${id}`);
  }

  getDocuments(id: number): Observable<IOutboundDocument[]> {
    return this.http.get<IOutboundDocument[]>(`${this.url}/${id}/documents`);
  }

  getUnloadedDocuments(): Observable<IOutboundDocument[]> {
    return this.http.get<IOutboundDocument[]>(`${this.url}/documents`);
  }

  getIdentifier(): Observable<{identifier: string}> {
    return this.http.post<{identifier: string}>(`${this.url}/identifier`, null);
  }

  create(load: IOutboundLoad): Observable<IOutboundLoad> {
    return this.http.post<IOutboundLoad>(this.url, load);
  }

  update(load: IOutboundLoad): Observable<IOutboundLoad> {
    return this.http.put<IOutboundLoad>(`${this.url}/${load.id}`, load);
  }

  addDocument(loadId: number, documentId: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${loadId}/documents/add`, { documentId });
  }

  removeDocument(loadId: number, documentId: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${loadId}/documents/remove`, { documentId });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
