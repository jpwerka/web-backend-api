import { IPostToOtherMethod } from './interceptor.interface';

/**
 * Interface for BackendService configuration options
 */
export abstract class BackendConfigArgs {
  /**
   * The base path to the api, e.g, 'api/'.
   * If not specified than `parseRequestUrl` assumes it is the first path segment in the request.
   */
  apiBase?: string;
  /**
   * false (default) if search match should be case insensitive
   */
  caseSensitiveSearch?: boolean;
  /**
   * false (default) put content directly inside the response body.
   * true: encapsulate content in a `data` property inside the response body, `{ data: ... }`.
   */
  dataEncapsulation?: boolean;
  /**
   * false: put content directly inside the response body when not request a page.
   * true (default) encapsulate content in a `object` property inside the response body, `{ hasNext: boolean, itens: ... }`.
   * Note: When a page param is sent in query string, it always returns content in an `object` property
   */
  pageEncapsulation?: boolean;
  /**
   * 'autoincrement' (default) strategy for generate ids for items in collections
   */
  strategyId?: 'uuid'|'autoincrement'|'provided';
  /**
   * true (default) assign attributes values in body preserving original item;
   * false replace item in body in collection
   */
  appendPut?: boolean;
  /**
   * true (default) assign attributes values in body preserving original item;
   * false replace item in body in collection
   */
  appendExistingPost?: boolean;
  /**
   * delay (in ms) to simulate latency
   */
  delay?: number;
  /**
   * false (default) should 204 when object-to-delete not found; true: 404
   */
  delete404?: boolean;
  /**
   * host for this service, e.g., 'localhost'
   */
  host?: string;
  /**
   * false (default) return NOT FOUND (404) for unknown collection. false: should pass unrecognized request URL through to original backend;
   */
  passThruUnknownUrl?: boolean;
    /**
   * false (default) should NOT return the item in body after a POST. true: return the item in body.
   */
  returnBodyIn201?: boolean;
  /**
   * false (default) should NOT update existing item with POST. false: OK to update.
   */
  post409?: boolean;
  /**
   * true (default) should NOT return the item (204) after a POST. false: return the item (200).
   */
  put204?: boolean;
  /**
   * false (default) if item not found, create as new item; false: should 404.
   */
  put404?: boolean;
  /**
   * root path _before_ any API call, e.g., ''
   */
  rootPath?: string;
  /**
   * [] (default) POST method mappings for other methods
   */
  postsToOtherMethod?: IPostToOtherMethod[];
  /**
   * false (default) log request and response to console
   */
  log?: boolean;
  /**
   * false (default) apply `JSON.parse()` with transform String dates in Date objetcs
   */
  jsonParseWithDate?: boolean;
}

/**
 * Interface for InMemoryBackend configuration options
 */
export abstract class BackendTypeArgs {
  dbtype?: 'memory' | 'indexdb';
  databaseName?: string;
}
