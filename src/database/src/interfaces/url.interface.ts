
/** Interface of information about a Uri  */
export interface IUriInfo {
  source: string;
  protocol: string;
  authority: string;
  userInfo: string;
  user: string;
  password: string;
  host: string;
  port: string;
  relative: string;
  path: string;
  directory: string;
  file: string;
  query: string;
  anchor: string;
}

/**
 *
 * Interface for the result of the `parseRequestUrl` method:
 *   Given URL "http://localhost:8080/api/customers/42?foo=1 the default implementation returns
 *     base: 'api/'
 *     collectionName: 'customers'
 *     id: '42'
 *     query: Map(['foo', ['1']])
 *     resourceUrl: 'http://localhost/api/customers/'
 */
export interface IParsedRequestUrl {
  apiBase: string;        // the slash-terminated "base" for api requests (e.g. `api/`)
  collectionName: string; // the name of the collection of data items (e.g.,`customers`)
  id: string;             // the (optional) id of the item in the collection (e.g., `42`)
  resourceUrl: string;    // the effective URL for the resource (e.g., 'http://localhost/api/customers/')
  extras?: string;        // the extra path after collection and id (e.g., 'http://localhost/api/customers/:id/address')
  query?: Map<string, string[]>; // the query parameters;
}
