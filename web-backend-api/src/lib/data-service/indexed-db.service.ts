/* eslint-disable @typescript-eslint/no-this-alias */
import { cloneDeep } from 'lodash';
import { Observable, throwError } from 'rxjs';
import { v4 } from 'uuid';
import { IBackendService, IJoinField, LoadFn } from '../interfaces/backend.interface';
import { BackendConfigArgs } from '../interfaces/configuration.interface';
import { IHttpResponse, IPassThruBackend } from '../interfaces/interceptor.interface';
import { IQueryCursor, IQueryFilter, IQueryParams, IQueryResult } from '../interfaces/query.interface';
import { STATUS } from '../utils/http-status-codes';
import { BackendService, IExtendEntity } from './backend.service';

interface IEventTargetError extends EventTarget {
  error: unknown;
  errorCode: number;
}

export class IndexedDbService extends BackendService implements IBackendService {

  private dbName: string;
  private db: IDBDatabase;

  constructor(config: BackendConfigArgs, dbName = 'web-backend-api-db') {
    super(config);
    this.dbName = dbName;
  }

  createDatabase(): Promise<boolean> {
    const self = this;
    this.dbReadySubject.next(false);
    return new Promise<boolean>((resolve, reject) => {
      const request = window.indexedDB.open(self.dbName, 1);

      request.onsuccess = () => {
        self.db = request.result;
        console.log('[IndexedDbService] Database created!');
      };

      request.onerror = (event: Event) => {
        console.error('[IndexedDbService] Database error: ', (event.target as IEventTargetError).errorCode);
        reject((event.target as IEventTargetError).errorCode);
      };

      request.onupgradeneeded = () => {
        self.db = request.result;
        console.log('[IndexedDbService] Database upgrade nedded!');
        resolve(true);
      };
    });
  }

  deleteDatabase(): Promise<boolean> {
    this.dbReadySubject.next(false);
    return new Promise<boolean>((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase(this.dbName);

      const errorResponse = (event: Event) => {
        console.error('[IndexedDbService] Error deleting the DB');
        const mensagem = 'Não foi possível excluir o banco de dados da memória.\n' +
          'Verifique se você está com outra aba aberta com a aplicação.\n' +
          'Este comportamento é necessário para ter a garantia de sempre recriar o banco de dados.';
        alert(mensagem);
        reject((event.target as IEventTargetError).errorCode);
      };

      request.onblocked = (event: Event) => {
        errorResponse(event);
      };

      request.onerror = (event: Event) => {
        errorResponse(event);
      };

      request.onsuccess = () => {
        console.log('[IndexedDbService] Deleted OK.');
        // alert('*** NOTE : Requires page refresh to see the DB removed from the Resources IndexedDB tab in Chrome.');
        resolve(true);
      };
    });
  }

  closeDatabase(): void {
    this.db.close();
  }

  createObjectStore(dataServiceFn: Map<string, LoadFn[]>): Promise<boolean> {
    const self = this;
    return new Promise<boolean>((resolve, reject) => {
      let objectStore: IDBObjectStore;

      if (dataServiceFn && dataServiceFn.size > 0) {
        dataServiceFn.forEach((loadsFn, name) => {
          console.log('[IndexedDbService]', `${name} => Mock defined`);
          objectStore = self.db.createObjectStore(name, { keyPath: 'id', autoIncrement: self.config.strategyId === 'autoincrement' });
          if (loadsFn && Array.isArray(loadsFn)) {
            self.loadsFn.push(...loadsFn.filter(loadFn => loadFn instanceof Function));
          }
        });
      } else {
        console.warn('[WebBackendApi]', 'There is not collection in data service!');
        self.dbReadySubject.next(true);
        resolve(true);
      }

      objectStore.transaction.oncomplete = () => {
        self.loadsFn.forEach(fn => {
          fn.call(null, self);
        });
        self.dbReadySubject.next(true);
        resolve(true);
      };
      objectStore.transaction.onerror = (event: Event) => {
        reject(event);
      };
    });
  }

  storeData(collectionName: string, data: unknown): Promise<string | number> {
    const self = this;
    return new Promise<string | number>((resolve, reject) => {
      try {
        const objectStore = self.db.transaction(collectionName, 'readwrite').objectStore(collectionName);
        if (!data['id'] && self.config.strategyId !== 'autoincrement') {
          data['id'] = self.generateStrategyId();
        }

        const request = objectStore.add(data);
        request.onsuccess = () => {
          resolve(request.result as (string | number));
        };
        request.onerror = (event: Event) => {
          reject(event);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  clearData(collectionName: string): Promise<boolean> {
    const self = this;
    return new Promise<boolean>((resolve, reject) => {
      const objectStore = self.db.transaction(collectionName, 'readwrite').objectStore(collectionName);
      const request = objectStore.clear();
      request.onsuccess = () => {
        resolve(true);
      };
      request.onerror = (event: Event) => {
        reject(event);
      };
    });
  }

  hasCollection(collectionName: string): boolean {
    return this.db.objectStoreNames.contains(collectionName);
  }

  listCollections(): string[] {
    const result: string[] = [];
    // iterate backwards ensuring that length is an UInt32
    for (let i = this.db.objectStoreNames.length; i--;) {
      result.push(this.db.objectStoreNames[i]);
    }
    return result;
  }

  getInstance$(collectionName: string, id: string | number): Observable<unknown> {
    return new Observable((observer) => {
      let request: IDBRequest<unknown>;
      const objectStore = this.db.transaction(collectionName, 'readwrite').objectStore(collectionName);
      if (id !== undefined && id !== null && id !== '') {
        id = (this.config.strategyId === 'autoincrement' && typeof id !== 'number' ? parseInt(id, 10) : id) as number;
        request = objectStore.get(id);
        request.onsuccess = () => {
          observer.next(request.result);
          observer.complete();
        };
        request.onerror = (event) => {
          observer.error((event.target as IEventTargetError).error);
        };
      } else {
        observer.error('Não foi passado o id');
      }
    });
  }

  getAllByFilter$(collectionName: string, conditions?: IQueryFilter[]): Observable<unknown[]> {
    const self = this;
    return new Observable((observer) => {
      const objectStore = self.db.transaction(collectionName, 'readwrite').objectStore(collectionName);
      const request = objectStore.openCursor();
      const queryParams: IQueryParams = { count: 0, conditions };
      const queryResults: IQueryResult<IExtendEntity> = { hasNext: false, items: [] };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<unknown>).result as IDBCursorWithValue;
        if (self.getAllItems(cursor as unknown as IQueryCursor<IExtendEntity>, queryResults, queryParams)) {
          observer.next(queryResults.items);
          observer.complete();
        }
      };
      request.onerror = (event) => {
        observer.error((event.target as IEventTargetError).error);
      };
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
    const self = this;
    return new Observable((observer) => {
      let request: IDBRequest<unknown>;
      let isCursor = false;
      let queryParams: IQueryParams = { count: 0 };
      let queriesParams: { root: IQueryParams, children: IQueryParams };
      let queryResults: IQueryResult<IExtendEntity> = { hasNext: false, items: [] };

      if (id !== undefined && id !== '') {
        const findId = self.config.strategyId === 'autoincrement' ? parseInt(id, 10) : id;
        const objectStore = self.db.transaction(collectionName, 'readwrite').objectStore(collectionName);
        request = objectStore.get(findId);
      } else {
        const objectStore = self.db.transaction(collectionName, 'readwrite').objectStore(collectionName);
        request = objectStore.openCursor();
        isCursor = true;
        if (query) {
          queryParams = self.getQueryParams(collectionName, query, (caseSensitiveSearch ? caseSensitiveSearch : 'i'));
        }
        queriesParams = this.getQueryParamsRootAndChild(queryParams);
      }

      request.onsuccess = (event) => {
        if (!isCursor) {
          (async (item: IExtendEntity) => {
            if (item) {
              item = await self.applyTransformersGetById(collectionName, item, getJoinFields);
            }
            return item;
          })(request.result as IExtendEntity).then(
            item => {
              if (item) {
                const response = self.utils.createResponseOptions(url, STATUS.OK, this.bodify(item));
                observer.next(response);
                observer.complete();
              } else {
                // eslint-disable-next-line max-len
                const response = self.utils.createErrorResponseOptions(url, STATUS.NOT_FOUND, `Request id does not match item with id: ${id}`);
                observer.error(response);
              }
            },
            (error) => this.dispatchErrorToResponse(observer, url, error)
          );
        } else {
          const cursor = (event.target as IDBRequest<unknown>).result as IDBCursorWithValue;
          if (self.getAllItems(cursor as unknown as IQueryCursor<IExtendEntity>, queryResults, queriesParams.root)) {
            (async () => {
              if (queryResults.items.length) {
                await self.applyTransformersGetAll(collectionName, queryResults.items, getJoinFields);
                if (queriesParams.children) {
                  queryResults = self.getAllItemsFilterByChildren(queryResults.items, queriesParams.children);
                }
              }
            })().then(
              () => {
                const response = self.utils.createResponseOptions(url, STATUS.OK, self.pagefy(queryResults, queryParams));
                observer.next(response);
                observer.complete();
              },
              (error) => this.dispatchErrorToResponse(observer, url, error)
            );
          }
        }
      };

      request.onerror = (event) => {
        // eslint-disable-next-line max-len
        const response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR, (event.target as IEventTargetError).error);
        observer.error(response);
      };
    });
  }

  post$(collectionName: string, id: string, item: IExtendEntity, url: string): Observable<IHttpResponse<unknown>> {
    const self = this;
    return new Observable((observer) => {

      let findId = id ? self.config.strategyId === 'autoincrement' ? parseInt(id, 10) : id : undefined;
      if (item.id) {
        item.id = (this.config.strategyId === 'autoincrement' && typeof item.id !== 'number' ?
          parseInt(item.id, 10) : item.id) as number;
      } else {
        if (self.config.strategyId !== 'autoincrement') {
          item.id = findId ? findId : self.generateStrategyId(url);
        } else if (item.hasOwnProperty('id')) {
          delete item.id;
        }
      }

      if (findId && item.id && findId !== item.id) {
        const error = `Request id (${findId}) does not match item.id (${item.id})`;
        const response = self.utils.createErrorResponseOptions(url, STATUS.BAD_REQUEST, error);
        observer.error(response);
        return;
      } else {
        findId = item.id ? item.id : findId;
      }
      let requestGet: IDBRequest<unknown>;
      if (!findId) {
        requestGet = { result: false, onsuccess: () => true, onerror: () => false } as never;
      } else {
        requestGet = self.db.transaction(collectionName, 'readonly').objectStore(collectionName).get(findId);
      }

      requestGet.onsuccess = () => {
        if (!requestGet.result) {

          void (async () => {
            const transformfn = this.transformPostMap.get(collectionName);
            if (transformfn !== undefined) {
              item = await this.applyTransformPost(item, transformfn);
            }
          })().then(() => {
            const requestAdd = self.db.transaction(collectionName, 'readwrite').objectStore(collectionName).add(item);
            requestAdd.onsuccess = () => {
              if (requestAdd.result) {
                item.id = requestAdd.result as (string | number);
                (async () => {
                  if (this.config.returnItemIn201) {
                    item = await this.applyTransformersGetById(collectionName, cloneDeep(item));
                    return self.utils.createResponseOptions(url, STATUS.CREATED, self.bodify(item));
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
            };

            requestAdd.onerror = (event) => {
              const error = {
                message: `Error to add '${collectionName}' with id='${item.id}'`,
                detailedMessage: (event.target as IEventTargetError).error
              };
              const response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR, error);
              observer.error(response);
            };
          }, error => this.dispatchErrorToResponse(observer, url, error));

        } else if (self.config.post409) {
          const error = {
            message: `'${collectionName}' item with id='${id}' exists and may not be updated with POST.`,
            detailedMessage: 'Use PUT instead.'
          };
          const response = self.utils.createErrorResponseOptions(url, STATUS.CONFLICT, error);
          observer.error(response);
        } else { // if item already exists in collection

          void (async () => {
            const transformfn = this.transformPutMap.get(collectionName);
            if (transformfn !== undefined) {
              item = await this.applyTransformPut(requestGet.result as IExtendEntity, item, transformfn);
            }
          })().then(() => {

            if (self.config.appendExistingPost) {
              item = Object.assign({}, requestGet.result, item);
            }

            if (!item.id) {
              item['id'] = findId;
            }

            const requestPut = self.db.transaction(collectionName, 'readwrite').objectStore(collectionName).put(item);
            requestPut.onsuccess = () => {
              void (async () => {
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

            };

            requestPut.onerror = (event) => {
              const error = {
                message: `Error to update '${collectionName}' with id='${id}'`,
                detailedMessage: (event.target as IEventTargetError).error
              };
              const response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR, error);
              observer.error(response);
            };

          }, error => this.dispatchErrorToResponse(observer, url, error));
        }
      };

      requestGet.onerror = (event) => {
        const error = {
          message: `Error to find '${collectionName}' with id='${id}'`,
          detailedMessage: (event.target as IEventTargetError).error
        };
        const response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR, error);
        observer.error(response);
      };

      if (!findId) { // fake request
        requestGet.onsuccess(null);
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

    const self = this;
    return new Observable((observer) => {
      const requestGet = self.db.transaction(collectionName, 'readonly').objectStore(collectionName).get(findId);

      requestGet.onsuccess = () => {
        if (requestGet.result) {

          void (async () => {
            const transformfn = this.transformPutMap.get(collectionName);
            if (transformfn !== undefined) {
              item = await this.applyTransformPut(requestGet.result, item, transformfn);
            }
          })().then(() => {

            if (self.config.appendPut) {
              item = Object.assign({}, requestGet.result as IExtendEntity, item);
            }

            if (!item.id) {
              item.id = findId;
            }

            const requestPut = self.db.transaction(collectionName, 'readwrite').objectStore(collectionName).put(item);
            requestPut.onsuccess = () => {
              void (async () => {
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
            };

            requestPut.onerror = (event) => {
              const error = {
                message: `Error to update '${collectionName}' with id='${id}'`,
                detailedMessage: (event.target as IEventTargetError).error
              };
              const response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR, error);
              observer.error(response);
            };
          }, error => this.dispatchErrorToResponse(observer, url, error));

        } else if (self.config.put404) {
          const error = {
            message: `${collectionName} item with id (${id}) not found and may not be created with PUT.`,
            detailedMessage: 'Use POST instead.'
          };
          const response = self.utils.createErrorResponseOptions(url, STATUS.NOT_FOUND, error);
          observer.error(response);
        } else {
          void (async () => {
            const transformfn = this.transformPostMap.get(collectionName);
            if (transformfn !== undefined) {
              item = await this.applyTransformPost(item, transformfn);
            }
          })().then(() => {

            if (!item.id && self.config.strategyId !== 'autoincrement') {
              item['id'] = findId;
            }

            const requestAdd = self.db.transaction(collectionName, 'readwrite').objectStore(collectionName).add(item);
            requestAdd.onsuccess = () => {
              if (requestAdd.result) {
                item.id = requestAdd.result as (string | number);
                (async () => {
                  if (this.config.returnItemIn201) {
                    item = await this.applyTransformersGetById(collectionName, cloneDeep(item));
                    return self.utils.createResponseOptions(url, STATUS.CREATED, self.bodify(item));
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
            };

            requestAdd.onerror = (event) => {
              const error = {
                message: `Error to add '${collectionName}' with id='${item.id}'`,
                detailedMessage: (event.target as IEventTargetError).error
              };
              const response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR, error);
              observer.error(response);
            };
          }, error => this.dispatchErrorToResponse(observer, url, error));
        }
      };

      requestGet.onerror = (event) => {
        const error = {
          message: `Error to find '${collectionName}' with id='${id}'`,
          detailedMessage: (event.target as IEventTargetError).error
        };
        const response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR, error);
        observer.error(response);
      };
    });
  }

  delete$(collectionName: string, id: string, url: string): Observable<IHttpResponse<null>> {
    // eslint-disable-next-line eqeqeq
    if (id == undefined) {
      return throwError(this.utils.createErrorResponseOptions(url, STATUS.BAD_REQUEST, `Missing ${collectionName} id`));
    }
    const self = this;
    return new Observable((observer) => {
      const objectStore = self.db.transaction(collectionName, 'readwrite').objectStore(collectionName);
      const findId = self.config.strategyId === 'autoincrement' ? parseInt(id, 10) : id;

      const onsuccess = () => {
        const response = self.utils.createResponseOptions(url, STATUS.NO_CONTENT);
        observer.next(response as IHttpResponse<null>);
        observer.complete();
      };

      const onerror = (event: Event) => {
        const error = {
          message: `Error to delete '${collectionName}' with id='${id}'`,
          detailedMessage: (event.target as IEventTargetError).error
        };
        const response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR, error);
        observer.error(response);
      };

      if (self.config.delete404) {
        const requestGet = objectStore.get(findId);

        requestGet.onsuccess = () => {
          if (requestGet.result) {
            const request = objectStore.delete(findId);
            request.onsuccess = onsuccess;
            request.onerror = onerror;
          } else {
            const error = { message: `Error to find ${collectionName} with id (${id})`, detailedMessage: 'Id não encontrado.' };
            const response = self.utils.createErrorResponseOptions(url, STATUS.NOT_FOUND, error);
            observer.error(response);
          }
        };

        requestGet.onerror = onerror;
      } else {
        const request = objectStore.delete(findId);
        request.onsuccess = onsuccess;
        request.onerror = onerror;
      }
    });
  }

  private generateStrategyId(url?: string): string | number {
    if (this.config.strategyId === 'provided') {
      const error = url ? this.utils.createErrorResponseOptions(
        url,
        STATUS.BAD_REQUEST,
        'Id strategy is set as `provided` and id not provided.'
      ) : new Error('Id strategy is set as `provided` and id not provided.');
      throw error;
    } else {
      return v4();
    }
  }

  createPassThruBackend(): IPassThruBackend {
    throw new Error('Method not implemented.');
  }
}
