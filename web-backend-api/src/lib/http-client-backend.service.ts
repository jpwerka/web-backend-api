// tslint:disable-next-line: max-line-length
import { HttpBackend, HttpEvent, HttpRequest, HttpXhrBackend, XhrFactory, HttpHeaders, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Inject, Injectable, Optional, InjectionToken } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { IPassThruBackend, IErrorMessage } from './interfaces/interceptor.interface';
import { IBackendService } from './interfaces/interface.index';
import { STATUS, getStatusText } from './utils/http-status-codes';

export const BACKEND_SERVICE = new InjectionToken<IBackendService>('backend.service');

@Injectable()
export class HttpClientBackendService implements HttpBackend {

  constructor(
    @Inject(BACKEND_SERVICE) @Optional() private dbService: IBackendService,
    private xhrFactory: XhrFactory
  ) {
    this.dbService.backendUtils({
      createPassThruBackend: this.createPassThruBackend.bind(this),
      createResponseOptions: this.createResponseOptions.bind(this),
      createErrorResponseOptions: this.createErrorResponseOptions.bind(this)
    });
  }

  handle(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    try {
      return this.dbService.handleRequest(req);
    } catch (error) {
      const err = error.message || error;
      const resOptions = this.createErrorResponseOptions(req.url, STATUS.INTERNAL_SERVER_ERROR, err);
      return throwError(resOptions);
    }
  }

  private createPassThruBackend(): IPassThruBackend {
    try {
      return new HttpXhrBackend(this.xhrFactory);
    } catch (ex) {
      ex.message = 'Cannot create passThru404 backend; ' + (ex.message || '');
      throw ex;
    }
  }

  private createErrorResponseOptions(url: string, status: number, error?: IErrorMessage | any): HttpErrorResponse {
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

  private createResponseOptions(url: string, status: number, body?: any): HttpResponse<any> {
    let headers = (typeof body === 'string') ?
      new HttpHeaders({ 'Content-Type': 'text/html; charset=utf-8' }) :
      new HttpHeaders({ 'Content-Type': 'application/json' });
    if (status === STATUS.CREATED && !! body.id) {
      headers = headers.set('Location', url + '/' + body.id);
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
