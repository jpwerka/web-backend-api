/* eslint-disable @typescript-eslint/no-unsafe-return */
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { ErrorResponseFn, IBackendService, IErrorMessage, ResponseFn, STATUS, getStatusText } from '../../database';

export const BACKEND_SERVICE = new InjectionToken<IBackendService>('backend.service');

@Injectable()
export class HttpClientBackendService implements HttpBackend {

  constructor(
    @Inject(BACKEND_SERVICE) @Optional() private dbService: IBackendService
  ) {
    this.dbService.backendUtils({
      createPassThruBackend: () => this.dbService.createFetchBackend(),
      createResponseOptions: this.createResponseOptions.bind(this) as ResponseFn,
      createErrorResponseOptions: this.createErrorResponseOptions.bind(this) as ErrorResponseFn
    });
  }

  handle(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    try {
      return from(this.dbService.handleRequest<HttpEvent<unknown>>(req));
    } catch (error) {
      const err: unknown = (error as Error).message || error;
      const resOptions = this.createErrorResponseOptions(req.url, STATUS.INTERNAL_SERVER_ERROR, err);
      return throwError(() => resOptions);
    }
  }

  private createErrorResponseOptions(url: string, status: number, error?: IErrorMessage | unknown): HttpErrorResponse {
    return new HttpErrorResponse({
      error,
      url,
      headers: (typeof error === 'string') ?
        new HttpHeaders({ 'Content-Type': 'text/html; charset=utf-8' }) :
        new HttpHeaders({ 'Content-Type': 'application/json' }),
      status,
      statusText: getStatusText(status)
    });
  }

  private createResponseOptions(url: string, status: number, body?: unknown): HttpResponse<unknown> {
    let headers = (typeof body === 'string') ?
      new HttpHeaders({ 'Content-Type': 'text/html; charset=utf-8' }) :
      new HttpHeaders({ 'Content-Type': 'application/json' });
    if (status === STATUS.CREATED && !!body['id']) {
      headers = headers.set('Location', `${url}/${body['id']}`);
    }
    return new HttpResponse({
      body,
      url,
      headers,
      status,
      statusText: getStatusText(status)
    });
  }

}
