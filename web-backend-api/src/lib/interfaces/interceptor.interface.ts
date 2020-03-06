import { Observable } from 'rxjs';

export interface IHeadersCore {
  set(name: string, value: string | string[]): void | any;
  append(name: string, value: string | string[]): void | any;
  keys(): string[] | Iterator<string>;
  get(name: string): string | string[] | null;
  getAll?(name: string): string | string[] | null;
}

export interface IRequestCore<T> {
  method: string;
  url: string;
  urlWithParams?: string;
  headers?: IHeadersCore;
  body?: any;
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

/**
 * Type for a response function that will be applied to a request interceptor.
 * When returns a `Observable` the result of a observer must be a valid `HttpResponse`
 * @example
 *  // add interceptor to generate a document identifier in backend
 *  // intercept the url: http://myhost.com/api/documents/identifier
 *  const responseIdentifier = (utils: IInterceptorUtils) => {
 *    const identifier = Math.floor(Math.random() * (9000000000 - 1000000000)) + 1000000000;
 *    return utils.fn.response(utils.url, 200, {identifier});
 *  };
 *  dbService.addRequestInterceptor({
 *    method: 'POST',
 *    path: 'identifier',
 *    applyToPath: 'beforeId',
 *    collectionName: 'documents',
 *    response: responseIdentifier
 *   });
 *
 *  // intercept the url: http://myhost.com/api/documents/ for a custom map response
 *  const responseDocuments = (utils: IInterceptorUtils) => {
 *    return dbService.get$('documents', undefined, utils.query, utils.url).pipe(
 *      map((res: IHttpResponse<any>) => myCustomTransformDocumentsResponse(res))
 *    );
 *  };
 *  dbService.addRequestInterceptor({
 *    method: 'GET',
 *    path: '',
 *    applyToPath: 'beforeId',
 *    collectionName: 'documents',
 *    response: responseDocuments
 *   });
 */
export type ResponseInterceptorFn = (utils: IInterceptorUtils) => IHttpResponse<any> | IHttpErrorResponse | Observable<any>;

/**
 * Mapping interface for requests interceptions
 */
export interface IRequestInterceptor {
  /**
   * Method to intercept GET, POST, PUT and DELETE
   */
  method?: string;
  /**
   * Request path that must be intercepted.
   * This path will vary according to how it should be applied.
   * When applied to `complete` path, it will be applied by discarding only the `config.rootPath`.
   *   URL => http://myhost/api/userinfo => path: 'api/userinfo'.
   *
   * When applied `beforeId` path, it will be applied excluding `config.rootPath`,
   * `config.apiBase` and the `collectionName` from url. If `collectionName` has a replacer,
   * this is applied before interceptor.
   *   URL => http://myhost/api/customers/inactives => path: 'inactives'.
   *   URL => http://myhost/api/documents/outbound/identifier
   *       => replacer `documents/outbound` to `collectionName`
   *       => path: 'identifier'.
   *
   * When the `afterId` path is applied, it will be similar to the `beforeId`,
   * only discarding the segment of the URL that represents the id.
   *
   * Obs¹: The path can be empty, in this case will intercept request to get all e get by id to collection.
   *   URL => http://myhost/api/customers apply => `beforeId` => path: ''
   *   => expect to response that list all customers, but the response is the interceptor response.
   *   URL => http://myhost/api/customers/1 apply => `afterId` => path: ''
   *   => expect to response that get customer by id 1, but the response is the interceptor response.
   *
   * Obs²: The path can contains `**`, `:id` or `{id}` segments.
   *    URL => http://myhost/api/customers/:id/activate apply => `beforeId` => path: ':id/activate'
   * When `**` the segment is ignored for parser to intercept the request path.
   * When `:id` or `{id}` the respectives ids are parsed and passed to interceptor response function in `utils.interceptorIds` parameter
   */
  path: string;
  /**
   * How the path will be interpreted.
   */
  applyToPath?: 'complete' | 'beforeId' | 'afterId';
  /**
   * Collection name that the interceptor is applied.
   * This only used if apply to `beforeId` and `afterId`
   */
  collectionName?: string;
  /**
   * Query parameters that need to be found in the request with the respective values to intercept the response.
   * It is not necessary for the parameters to be in the same order as the query string.
   */
  query?: Map<string, string[]> | { [param: string]: string } | string;

  /**
   * The response that must be returned when the interceptor is activated.
   * It can be a JSON in the format `IHttpResponse` or `IHttpErrorResponse` or else a function with the
   * signature `ResponseInterceptorFn` that will process the request and respond dynamically to it.
   * @see IHttpResponse
   * @see IHttpErrorResponse
   * @see ResponseInterceptorFn
   */
  response: ResponseInterceptorFn | IHttpResponse<any> | IHttpErrorResponse;
}

/**
 * Object that contains information useful for processing an interceptor
 */
export interface IInterceptorUtils {
  /**
   * URL for request interceptor
   */
  url: string;
  /**
   * ID for a collection item that the interceptor will be applied.
   * Only have this property value if `applyToPath = 'afterId'`.
   */
  id?: string;
  /**
   * ID or IDs for a URL segments that the interceptor will be applied.
   * Only have this property value if path contains `:id` or `{id}`.
   */
  interceptorIds?: string[];
  /**
   * Query string params that will be applied to the interceptor
   * These are the parameters received at the URL, not those used to compare the interceptor.
   */
  query?: Map<string, string[]>;
  /**
   * Request body, when exists
   */
  body?: any;
  /**
   * Utility to assemble responses in the standard format expected by the library.
   */
  fn: {
    /** Allows you to create a successful response */
    response: ResponseFn;
    /** Allows you to create a error response */
    errorResponse: ErrorResponseFn;
  };
}

/**
 * Post request mapping interface for other methods
 */
export interface IPostToOtherMethod {
  /**
   * Other method that have to apply to request
   */
  otherMethod: 'PUT' | 'DELETE';
  /**
   * How to aply this map for a request:
   * @value urlSegment => apply the value property to URL segments in reverse
   *    URL => http://myhost/api/{colection}/{id}/{segment}
   * @value queryParam => apply the value property to URL query string param name
   *    URL => http://myhost/api/{colection}/{id}?{param}={value}
   * @value bodyParam => apply the value property to body property named in param
   *    URL => http://myhost/api/{colection}/{id}
   *    BODY => { param: value, otherProperty: otherValue }
   */
  applyTo: 'urlSegment' | 'queryParam' | 'bodyParam';
  /**
   * Value to compare with URL segment, URL query string or BODY property
   */
  value: string;
  /**
   * URL query string param name or BODY protery name to use for compare with value
   */
  param?: string;
}

export interface IPassThruBackend {
  /**
   * Handle an HTTP request and return an Observable of HTTP response
   * Both the request type and the response type are determined by the supporting HTTP library.
   */
  handle(req: IRequestCore<any>): Observable<any>;
}
