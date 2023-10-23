/* eslint-disable @typescript-eslint/no-unsafe-return */
import { HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { RequestMatch } from '@angular/common/http/testing';
import { Inject, Injectable, Optional } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { IBackendService } from '../../../database';
import { BACKEND_SERVICE, HttpClientBackendService } from '../../src/http-client-backend.service';

export interface IRequestResponse {
  request: HttpRequest<unknown>;
  response: HttpResponse<unknown> | HttpErrorResponse
}

function describeRequest(request: HttpRequest<unknown>): string {
  const url = request.urlWithParams;
  const method = request.method;
  return `${method} ${url}`;
}

@Injectable()
export class HttpClientTestingBackendService extends HttpClientBackendService {

  private requests: IRequestResponse[] = [];

  constructor(
    @Inject(BACKEND_SERVICE) @Optional() dbService: IBackendService
  ) {
    super(dbService);
  }

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    const reqRes: IRequestResponse = {
      request,
      response: undefined
    }
    this.requests.push(reqRes);
    return super.handle(request).pipe(
      tap((response) => reqRes.response = response as HttpResponse<unknown>),
      catchError(err => {
        reqRes.response = err as HttpErrorResponse;
        return throwError(err);
      })
    );
  }

  expectOne(match: string | RequestMatch | ((req: HttpRequest<unknown>) => boolean), description?: string): IRequestResponse {
    description = description || this.descriptionFromMatcher(match);
    const matches = this.match(match);
    if (matches.length > 1) {
      throw new Error(`Expected one matching request for criteria "${description}", found ${matches.length} requests.`);
    }
    if (matches.length === 0) {
      let message = `Expected one matching request for criteria "${description}", found none.`;
      if (this.requests.length > 0) {
        // Show the methods and URLs of open requests in the error, for convenience.
        const requests = this.requests.map(req => describeRequest(req.request)).join(', ');
        message += ` Requests received are: ${requests}.`;
      }
      throw new Error(message);
    }
    return matches[0];
  }

  expectNone(match: string | RequestMatch | ((req: HttpRequest<unknown>) => boolean), description?: string): void {
    description = description || this.descriptionFromMatcher(match);
    const matches = this.match(match);
    if (matches.length > 0) {
      throw new Error(`Expected zero matching requests for criteria "${description}", found ${matches.length}.`);
    }
  }

  private match(match: string | RequestMatch | ((req: HttpRequest<unknown>) => boolean)): IRequestResponse[] {
    if (typeof match === 'string') {
      return this.requests.filter(testReq => testReq.request.urlWithParams === match);
    } else if (typeof match === 'function') {
      return this.requests.filter(testReq => match(testReq.request));
    } else {
      return this.requests.filter(
        testReq => (!match.method || testReq.request.method === match.method.toUpperCase()) &&
          (!match.url || testReq.request.urlWithParams === match.url));
    }
  }

  private descriptionFromMatcher(matcher: string | RequestMatch | ((req: HttpRequest<unknown>) => boolean)): string {
    if (typeof matcher === 'string') {
      return `Match URL: ${matcher}`;
    } else if (typeof matcher === 'object') {
      const method = matcher.method || '(any)';
      const url = matcher.url || '(any)';
      return `Match method: ${method}, URL: ${url}`;
    } else {
      return `Match by function: ${matcher.name}`;
    }
  }
}

