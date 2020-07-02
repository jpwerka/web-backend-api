import { BackendConfigArgs } from '../interfaces/configuration.interface';

export class BackendConfig implements BackendConfigArgs {
  constructor(config: BackendConfigArgs = {}) {
    Object.assign(this, {
      // default config:
      caseSensitiveSearch: false,
      dataEncapsulation: false, // do NOT wrap content within an object with a `data` property
      pageEncapsulation: true,
      strategyId: 'autoincrement', // use `autoincrement` with default strategy
      appendPut: true, // assign attributes values in body preserving original item
      appendExistingPost: true, // assign attributes values in body preserving original item
      delay: 500, // simulate latency by delaying response
      delete404: false, // don't complain if can't find entity to delete
      passThruUnknownUrl: false, // 404 if can't process URL
      post204: true, // don't return the item after a POST
      post409: false, // don't update existing item with that ID
      put204: true,  // don't return the item after a PUT
      put404: false, // create new item if PUT item with that ID not found
      apiBase: undefined, // assumed to be the first path segment
      host: undefined,    // default value is actually set in InMemoryBackendService ctor
      rootPath: undefined, // default value is actually set in InMemoryBackendService ctor
      postsToOtherMethod: undefined,
      log: false,
    }, config);
  }
}
