import { Observable } from 'rxjs';

export interface IRequestCore<T> {
  method: string;
  url: string;
  urlWithParams?: string;
  body?: any;
}

export interface IHeadersCore {
  set(name: string, value: string): void | any;
}

export interface IResponseBase {

  /**
   * Response headers
   */
  headers?: IHeadersCore;

  /**
   * Http {@link http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html status code}
   * associated with the response.
   */
  status?: number;

  /**
   * Status text for the status code
   */
  statusText?: string;
  /**
   * request url
   */
  url?: string;
}

export interface IHttpResponse<T> extends IResponseBase {
  body?: T;
}


export interface IErrorMessage {
  message: string;
  detailedMessage?: string;
}

export interface IHttpErrorResponse extends IResponseBase {
  error?: IErrorMessage | any;
}

export type ErrorResponseFn = (url: string, status: number, error?: IErrorMessage | any) => IHttpErrorResponse;

export type ResponseFn = (url: string, status: number, body?: any) => IHttpResponse<any>;

export interface IResponseUtils {
  responseFn: ResponseFn;
  errorResponseFn: ErrorResponseFn;
  collectionName?: string;
  id?: string;
  interceptorIds?: string[];
}

export type ResponseInterceptorFn = (utils: IInterceptorUtils) => IHttpResponse<any> | IHttpErrorResponse;

export interface IRequestInterceptor {
  method?: string;
  path: string;
  collectionName?: string;
  query?: Map<string, string[]> | { [param: string]: string } | string;
  response: ResponseInterceptorFn | IHttpResponse<any> | IHttpErrorResponse;
  applyToPath?: 'complete' | 'beforeId' | 'afterId';
}

export interface IInterceptorUtils {
  url: string;
  id?: string;
  interceptorIds?: string[];
  query?: Map<string, string[]>;
  body?: any;
  fn: {
    response: ResponseFn;
    errorResponse: ErrorResponseFn;
  };
}

export interface IRequestInfo {
  req: IRequestCore<any>;
  method: string;
  url: string;
  apiBase: string;
  collectionName: string;
  id: string;
  query: Map<string, string[]>;
  extras?: string;
  resourceUrl: string;
  body?: any;
  interceptor?: IRequestInterceptor;
  interceptorIds?: string[];
  utils?: IResponseUtils;
}

export interface IPostToOtherMethod {
  otherMethod: 'PUT' | 'DELETE';
  applyTo: 'urlSegment' | 'queryParam' | 'bodyParam';
  value: string;
  param?: string;
}

export interface IPassThruBackend {
  /**
   * Handle an HTTP request and return an Observable of HTTP response
   * Both the request type and the response type are determined by the supporting HTTP library.
   */
  handle(req: IRequestCore<any>): Observable<any>;
}
