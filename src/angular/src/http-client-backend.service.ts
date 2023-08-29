/* eslint-disable @typescript-eslint/no-unsafe-return */
import { XhrFactory } from '@angular/common';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpHeaders, HttpRequest, HttpResponse, HttpXhrBackend } from '@angular/common/http';
import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { ErrorResponseFn, getStatusText, IBackendService, IErrorMessage, IPassThruBackend, ResponseFn, STATUS } from '../../database';
import { Observable, from, throwError } from 'rxjs';

export const BACKEND_SERVICE = new InjectionToken<IBackendService>('backend.service');

@Injectable()
export class HttpClientBackendService implements HttpBackend {

  constructor(
    @Inject(BACKEND_SERVICE) @Optional() private dbService: IBackendService,
    private xhrFactory: XhrFactory
  ) {
    this.dbService.backendUtils({
      createPassThruBackend: this.createPassThruBackend.bind(this) as () => IPassThruBackend,
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
      return throwError(resOptions);
    }
  }

  private createPassThruBackend(): IPassThruBackend {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new HttpXhrBackend(this.xhrFactory) as any;
    } catch (ex) {
      (ex as Error).message = `Cannot create passThru404 backend; ${(ex as Error).message || ''}`;
      throw ex;
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
