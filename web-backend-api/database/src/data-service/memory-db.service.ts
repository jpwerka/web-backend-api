import { cloneDeep } from 'lodash';
import { Observable, throwError } from 'rxjs';
import { v4 } from 'uuid';
import { IBackendService, IJoinField, LoadFn } from '../interfaces/backend.interface';
import { BackendConfigArgs } from '../interfaces/configuration.interface';
import { IHttpResponse, IPassThruBackend } from '../interfaces/interceptor.interface';
import { IQueryCursor, IQueryFilter, IQueryParams, IQueryResult } from '../interfaces/query.interface';
import { STATUS } from '../utils/http-status-codes';
import { BackendService, IExtendEntity } from './backend.service';

export class MemoryDbService extends BackendService implements IBackendService {

  private db: Map<string, IExtendEntity[]>;

  constructor(config: BackendConfigArgs) {
    super(config);
  }

  createDatabase(): Promise<boolean> {
    this.dbReadySubject.next(false);
    return new Promise<boolean>((resolve) => {
      this.db = new Map<string, IExtendEntity[]>();
      resolve(true);
    });
  }

  deleteDatabase(): Promise<boolean> {
    this.dbReadySubject.next(false);
    return new Promise<boolean>((resolve) => {
      this.db = undefined;
      resolve(true);
    });
  }

  createObjectStore(dataServiceFn: Map<string, LoadFn[]>): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (dataServiceFn && dataServiceFn.size > 0) {
        dataServiceFn.forEach((loadsFn, name) => {
          this.db.set(name, []);
          if (loadsFn && Array.isArray(loadsFn)) {
            loadsFn.forEach(loadFn => {
              if (loadFn && loadFn instanceof Function) {
                loadFn.call(null, this);
              }
            });
          }
        });
      } else {
        console.warn('[WebBackendApi]', 'There is not collection in data service!');
      }
      this.dbReadySubject.next(true);
      resolve(true);
    });
  }

  storeData(collectionName: string, data: unknown): Promise<string | number> {
    return new Promise<string | number>((resolve, reject) => {
      try {
        const objectStore = this.db.get(collectionName);
        if (!data['id']) {
          data['id'] = this.generateStrategyId(objectStore, collectionName);
        }
        objectStore.splice(this.sortedIndex(objectStore, data['id']), 0, data as IExtendEntity);
        resolve(data['id']);
      } catch (error) {
        reject(error);
      }
    });
  }

  clearData(collectionName: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.db.set(collectionName, []);
      resolve(true);
    });
  }

  hasCollection(collectionName: string): boolean {
    return this.db.has(collectionName);
  }

  listCollections(): string[] {
    return Array.from(this.db.keys());
  }

  getInstance$<T = unknown>(collectionName: string, id: string | number): Promise<T> {
    return new Promise((resolve, reject) => {
      const objectStore = this.db.get(collectionName);
      if (id !== undefined && id !== null && id !== '') {
        id = this.config.strategyId === 'autoincrement' && typeof id !== 'number' ? parseInt(id, 10) : id;
        resolve(cloneDeep(this.findById(objectStore, id)) as unknown as T);
      } else {
        reject('Não foi passado o id');
      }
    });
  }

  getAllByFilter$(collectionName: string, conditions?: IQueryFilter[]): Observable<unknown[]> {
    return new Observable((observer) => {
      const objectStore = this.db.get(collectionName);
      const queryParams: IQueryParams = { count: 0, conditions };
      const queryResults: IQueryResult<IExtendEntity> = { hasNext: false, items: [] };

      const cursor: IQueryCursor<IExtendEntity> = {
        index: 0,
        value: null,
        continue: (): void => null
      };
      while (cursor.index <= objectStore.length) {
        cursor.value = (cursor.index < objectStore.length) ? cloneDeep(objectStore[cursor.index++]) : null;
        if (this.getAllItems((cursor.value ? cursor : null), queryResults, queryParams)) {
          observer.next(queryResults.items);
          observer.complete();
          break;
        }
      }
    });
  }

  get$(
    collectionName: string,
    id: string,
    query: Map<string, string[]>,
    url: string,
    getJoinFields?: IJoinField[],
    caseSensitiveSearch?: string
  ): Observable<
    IHttpResponse<unknown> |
    IHttpResponse<{ data: unknown }> |
    IHttpResponse<unknown[]> |
    IHttpResponse<{ data: unknown[] }> |
    IHttpResponse<IQueryResult<unknown>>
  > {
    return new Observable((observer) => {
      const objectStore = this.db.get(collectionName);

      if (id !== undefined && id !== '') {
        const findId = id ? this.config.strategyId === 'autoincrement' ? parseInt(id, 10) : id : undefined;
        let item = this.findById(objectStore, findId);

        item = item ? cloneDeep(item) : item;

        (async (itemAsync: IExtendEntity) => {
          if (itemAsync) {
            itemAsync = await this.applyTransformersGetById(collectionName, itemAsync, getJoinFields);
          }
          return itemAsync;
        })(item).then(
          itemAsync => {
            if (itemAsync) {
              const response = this.utils.createResponseOptions(url, STATUS.OK, this.bodify(itemAsync));
              observer.next(response as (IHttpResponse<unknown> | IHttpResponse<{ data: unknown }>));
              observer.complete();
            } else {
              // eslint-disable-next-line max-len
              const response = this.utils.createErrorResponseOptions(url, STATUS.NOT_FOUND, `Request id does not match item with id: ${id}`);
              observer.error(response);
            }
          },
          (error) => this.dispatchErrorToResponse(observer, url, error)
        );
      } else {
        let queryParams: IQueryParams = { count: 0 };
        let queryResults: IQueryResult<IExtendEntity> = { hasNext: false, items: [] };
        if (query) {
          queryParams = this.getQueryParams(collectionName, query, (caseSensitiveSearch ? caseSensitiveSearch : 'i'));
        }
        const queriesParams = this.getQueryParamsRootAndChild(queryParams);
        const cursor: IQueryCursor<IExtendEntity> = {
          index: 0,
          value: null,
          continue: (): void => null
        };
        let items = objectStore;
        if (queryParams.orders) {
          items = this.orderItems(items, queryParams.orders);
        }
        while (cursor.index <= items.length) {
          cursor.value = (cursor.index < items.length) ? cloneDeep(items[cursor.index++]) : null;
          if (this.getAllItems((cursor.value ? cursor : null), queryResults, queriesParams.root)) {
            break;
          }
        }
        (async () => {
          if (queryResults.items.length) {
            await this.applyTransformersGetAll(collectionName, queryResults.items, getJoinFields);
            if (queriesParams.children) {
              queryResults = this.getAllItemsFilterByChildren(queryResults.items, queriesParams.children);
            }
          }
        })().then(
          () => {
            const response = this.utils.createResponseOptions(url, STATUS.OK, this.pagefy(queryResults, queryParams));
            // eslint-disable-next-line max-len
            observer.next(response as (IHttpResponse<unknown[]> | IHttpResponse<{ data: unknown[] }> | IHttpResponse<IQueryResult<unknown>>));
            observer.complete();
          },
          (error) => this.dispatchErrorToResponse(observer, url, error));
      }
    });
  }

  post$(collectionName: string, id: string, item: IExtendEntity, url: string): Observable<IHttpResponse<unknown>> {
    return new Observable((observer) => {
      const objectStore = this.db.get(collectionName);

      let findId = id ? this.config.strategyId === 'autoincrement' ? parseInt(id, 10) : id : undefined;
      if (item.id) {
        item.id = this.config.strategyId === 'autoincrement' && typeof item.id !== 'number' ? parseInt(item.id, 10) : item.id;
      } else {
        item.id = findId ? findId : this.generateStrategyId(objectStore, collectionName, url);
      }

      if (findId && item.id && findId !== item.id) {
        const error = `Request id (${findId}) does not match item.id (${item.id})`;
        const response = this.utils.createErrorResponseOptions(url, STATUS.BAD_REQUEST, error);
        observer.error(response);
        return;
      } else {
        findId = item.id ? item.id : findId;
      }

      const existingIx = this.indexOf(objectStore, findId);

      if (existingIx === -1) {
        (async () => {
          const transformfn = this.transformPostMap.get(collectionName);
          if (transformfn !== undefined) {
            item = await this.applyTransformPost(item, transformfn);
          }

          objectStore.splice(this.sortedIndex(objectStore, item.id), 0, item);

          if (this.config.returnItemIn201) {
            item = await this.applyTransformersGetById(collectionName, cloneDeep(item));
            return this.utils.createResponseOptions(url, STATUS.CREATED, this.bodify(item));
          } else {
            const response = this.utils.createResponseOptions(url, STATUS.CREATED, { id: item.id });
            delete response.body;
            return response;
          }
        })().then(response => {
          observer.next(response);
          observer.complete();
        }, error => this.dispatchErrorToResponse(observer, url, error));
      } else if (this.config.post409) {
        const error = {
          message: `'${collectionName}' item with id='${id}' exists and may not be updated with POST.`,
          detailedMessage: 'Use PUT instead.'
        };
        const response = this.utils.createErrorResponseOptions(url, STATUS.CONFLICT, error);
        observer.error(response);
      } else {
        (async () => {
          const transformfn = this.transformPutMap.get(collectionName);
          if (transformfn !== undefined) {
            item = await this.applyTransformPut(objectStore[existingIx], item, transformfn);
          }

          if (this.config.appendExistingPost) {
            item = Object.assign({}, objectStore[existingIx], item);
          }

          objectStore[existingIx] = item;

          if (this.config.put204) {
            return this.utils.createResponseOptions(url, STATUS.NO_CONTENT);
          } else {
            item = await this.applyTransformersGetById(collectionName, cloneDeep(item));
            return this.utils.createResponseOptions(url, STATUS.OK, this.bodify(item));
          }
        })().then(response => {
          observer.next(response);
          observer.complete();
        }, error => this.dispatchErrorToResponse(observer, url, error));
      }
    });
  }

  put$(collectionName: string, id: string, item: IExtendEntity, url: string): Observable<IHttpResponse<unknown>> {
    // eslint-disable-next-line eqeqeq
    if (id == undefined) {
      return throwError(this.utils.createErrorResponseOptions(url, STATUS.BAD_REQUEST, `Missing ${collectionName} id`));
    }

    if (item.id) {
      item.id = this.config.strategyId === 'autoincrement' && typeof item.id !== 'number' ? parseInt(item.id, 10) : item.id;
    }

    const findId = this.config.strategyId === 'autoincrement' ? parseInt(id, 10) : id;
    if (item.id && item.id !== findId) {
      const error = {
        message: `Request for ${collectionName} id (${id}) does not match item.id (${item.id})`,
        detailedMessage: `Don't provide item.id in body or provide same id in both (url, body).`
      };
      return throwError(this.utils.createErrorResponseOptions(url, STATUS.BAD_REQUEST, error));
    }

    return new Observable((observer) => {
      const objectStore = this.db.get(collectionName);
      const existingIx = this.indexOf(objectStore, findId);

      if (existingIx >= 0) {

        void (async () => {
          const transformfn = this.transformPutMap.get(collectionName);
          if (transformfn !== undefined) {
            item = await this.applyTransformPut(objectStore[existingIx], item, transformfn);
          }

          if (this.config.appendPut) {
            item = Object.assign({}, objectStore[existingIx], item);
          }

          if (!item.id) {
            item['id'] = findId;
          }

          objectStore[existingIx] = item;
          if (this.config.put204) {
            return this.utils.createResponseOptions(url, STATUS.NO_CONTENT);
          } else {
            item = await this.applyTransformersGetById(collectionName, cloneDeep(item));
            return this.utils.createResponseOptions(url, STATUS.OK, this.bodify(item));
          }
        })().then(response => {
          observer.next(response);
          observer.complete();
        }, error => this.dispatchErrorToResponse(observer, url, error));

      } else if (this.config.put404) {
        const error = {
          message: `${collectionName} item with id (${id}) not found and may not be created with PUT.`,
          detailedMessage: 'Use POST instead.'
        };
        const response = this.utils.createErrorResponseOptions(url, STATUS.NOT_FOUND, error);
        observer.error(response);
      } else {
        if (!item.id) {
          item['id'] = findId;
        }

        void (async () => {
          const transformfn = this.transformPostMap.get(collectionName);
          if (transformfn !== undefined) {
            item = await this.applyTransformPost(item, transformfn);
          }

          objectStore.splice(this.sortedIndex(objectStore, item.id), 0, item);

          if (this.config.returnItemIn201) {
            item = await this.applyTransformersGetById(collectionName, cloneDeep(item));
            return this.utils.createResponseOptions(url, STATUS.CREATED, this.bodify(item));
          } else {
            const response = this.utils.createResponseOptions(url, STATUS.CREATED, { id: item.id });
            delete response.body;
            return response;
          }
        })().then(response => {
          observer.next(response);
          observer.complete();
        }, error => this.dispatchErrorToResponse(observer, url, error));
      }
    });
  }

  delete$(collectionName: string, id: string, url: string): Observable<IHttpResponse<null>> {
    // eslint-disable-next-line eqeqeq
    if (id == undefined) {
      return throwError(this.utils.createErrorResponseOptions(url, STATUS.BAD_REQUEST, `Missing ${collectionName} id`));
    }
    return new Observable((observer) => {
      const objectStore = this.db.get(collectionName);
      const findId = this.config.strategyId === 'autoincrement' ? parseInt(id, 10) : id;
      if (this.removeById(objectStore, findId) || !this.config.delete404) {
        const response = this.utils.createResponseOptions(url, STATUS.NO_CONTENT);
        observer.next(response as IHttpResponse<null>);
        observer.complete();
      } else {
        const error = { message: `Error to find ${collectionName} with id (${id})`, detailedMessage: 'Id não encontrado.' };
        const response = this.utils.createErrorResponseOptions(url, STATUS.NOT_FOUND, error);
        observer.error(response);
      }
    });
  }

  private generateStrategyId(collection: IExtendEntity[], collectionName: string, url?: string): string | number {
    if (this.config.strategyId === 'provided') {
      const error = url ? this.utils.createErrorResponseOptions(
        url,
        STATUS.BAD_REQUEST,
        'Id strategy is set as `provided` and id not provided.'
      ) : new Error('Id strategy is set as `provided` and id not provided.');
      throw error;
    }
    if (this.config.strategyId === 'uuid') {
      return v4();
    } else {
      if (!this.isCollectionIdNumeric(collection)) {
        const message = `Collection ${collectionName} id type is non-numeric or unknown. Can only generate numeric ids.`;
        const error = url ? this.utils.createErrorResponseOptions(
          url,
          STATUS.BAD_REQUEST,
          message
        ) : new Error(message);
        throw error;
      }
      let maxId = 0;
      collection.forEach((item: IExtendEntity) => {
        maxId = Math.max(maxId, typeof item.id === 'number' ? item.id : maxId);
      });
      return maxId + 1;
    }
  }

  private isCollectionIdNumeric(collection: IExtendEntity[]): boolean {
    // so that it could know the type of the `id` even when the collection is empty.
    if (Array.isArray(collection) && collection.length > 0) {
      return typeof collection[0].id === 'number';
    }
    return true;
  }

  private findById(collection: IExtendEntity[], id: string | number): IExtendEntity {
    return collection.find(item => item.id === id);
  }

  private indexOf(collection: IExtendEntity[], id: string | number) {
    return collection.findIndex(item => item.id === id);
  }

  private removeById(collection: IExtendEntity[], id: string | number) {
    const ix = this.indexOf(collection, id);
    if (ix > -1) {
      collection.splice(ix, 1);
      return true;
    }
    return false;
  }

  private sortedIndex(collection: IExtendEntity[], id: string | number) {
    let low = 0;
    let high = collection.length;

    while (low < high) {
      // eslint-disable-next-line no-bitwise
      const mid = (low + high) >>> 1;
      if (collection[mid].id < id) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }

  createPassThruBackend(): IPassThruBackend {
    throw new Error('Method not implemented.');
  }
}
