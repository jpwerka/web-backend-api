import { Observable, throwError } from 'rxjs';
import { v4 } from 'uuid';
import { IBackendService, LoadFn, TransformGetFn } from '../interfaces/backend.interface';
import { BackendConfigArgs } from '../interfaces/configuration.interface';
import { IPassThruBackend } from '../interfaces/interceptor.interface';
import { IQueryParams, IQueryResult } from '../interfaces/query.interface';
import { STATUS } from '../utils/http-status-codes';
import { BackendService, clone } from './backend.service';

export class IndexedDbService extends BackendService implements IBackendService {

  private dbName: string;
  private db: IDBDatabase;

  constructor(config: BackendConfigArgs, dbName: string = 'web-backend-api-db') {
    super(config);
    this.dbName = dbName;
  }

  createDatabase(): Promise<boolean> {
    const self = this;
    this.dbReadySubject.next(false);
    return new Promise<boolean>((resolve, reject) => {
      const request = window.indexedDB.open(self.dbName, 1);

      request.onsuccess = (event: Event) => {
        self.db = request.result;
        console.log('[IndexedDbService] Database created!');
      };

      request.onerror = (event: Event) => {
        console.error('[IndexedDbService] Database error: ', (event.target as any).errorCode);
        reject((event.target as any).errorCode);
      };

      request.onupgradeneeded = (event: Event) => {
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
        reject((event.target as any).errorCode);
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

  createObjectStore(dataServiceFn: Map<string, LoadFn>): Promise<boolean> {
    const self = this;
    return new Promise<boolean>((resolve, reject) => {
      let objectStore: IDBObjectStore;

      dataServiceFn.forEach((loadFn, name) => {
        console.log('[IndexedDbService]', `${name} => Mock defined`);
        objectStore = self.db.createObjectStore(name, { keyPath: 'id', autoIncrement: self.config.strategyId === 'autoincrement' });
        if (loadFn && loadFn instanceof Function) {
          self.loadsFn.push(loadFn);
        }
      });

      objectStore.transaction.oncomplete = (event: Event) => {
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

  storeData(collectionName: string, data: any): Promise<string | number> {
    const self = this;
    return new Promise<string | number>((resolve, reject) => {
      try {
        const objectStore = self.db.transaction(collectionName, 'readwrite').objectStore(collectionName);
        if (!data.id && self.config.strategyId !== 'autoincrement') {
          data['id'] = self.generateStrategyId();
        }

        const request = objectStore.add(data);
        request.onsuccess = (event: Event) => {
          resolve((request.result !== undefined) ? request.result['id'] : null);
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
      request.onsuccess = (event: Event) => {
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

  getInstance$(collectionName: string, id: any): Observable<any> {
    return new Observable((observer) => {
      let request: IDBRequest<any>;
      const objectStore = this.db.transaction(collectionName, 'readwrite').objectStore(collectionName);
      if (id !== undefined && id !== '') {
        request = objectStore.get(id);
        request.onsuccess = (event) => {
          observer.next(request.result);
          observer.complete();
        };
        request.onerror = (event) => {
          observer.error((event.target as any).error);
        };
      } else {
        observer.error('Não foi passado o id');
      }
    });
  }

  get$(
    collectionName: string, id: string, query: Map<string, string[]>, url: string, caseSensitiveSearch?: string
  ): Observable<any> {
    const self = this;
    return new Observable((observer) => {
      let response: any;
      let request: IDBRequest<any>;
      let isCursor = false;
      let transformfn: TransformGetFn;
      let queryParams: IQueryParams = { count: 0 };
      const queryResults: IQueryResult = { hasNext: false, items: [] };
      const objectStore = self.db.transaction(collectionName, 'readwrite').objectStore(collectionName);

      if (id !== undefined && id !== '') {
        const findId = self.config.strategyId === 'autoincrement' ? parseInt(id, 10) : id;
        request = objectStore.get(findId);
        transformfn = self.transformGetByIdMap.get(collectionName);
      } else {
        request = objectStore.openCursor();
        transformfn = self.transformGetAllMap.get(collectionName);
        isCursor = true;
        if (query) {
          queryParams = self.getQueryParams(collectionName,
            query, (caseSensitiveSearch ? caseSensitiveSearch : 'i'));
        }
      }

      request.onsuccess = (event) => {
        if (!isCursor) {
          let item = request.result;

          if (item && transformfn !== undefined) {
            item = transformfn.call(self, item, self);
          }

          response = self.utils.createResponseOptions(url, item ? STATUS.OK : STATUS.NOT_FOUND, item);
          observer.next(response);
          observer.complete();
        } else {
          const cursor: IDBCursorWithValue = (event.target as IDBRequest<any>).result;
          if (self.getAllItems(cursor, queryResults, queryParams, transformfn)) {
            response = self.utils.createResponseOptions(url, STATUS.OK, queryParams.page ? queryResults : self.bodify(queryResults.items));
            observer.next(response);
            observer.complete();
          }
        }
      };

      request.onerror = (event) => {
        response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR, (event.target as any).error);
        observer.error(response);
      };
    });
  }

  post$(collectionName: string, id: string, item: any, url: string): Observable<any> {
    const self = this;
    return new Observable((observer) => {
      let response: any;
      const objectStore = self.db.transaction(collectionName, 'readwrite').objectStore(collectionName);

      if (!item.id && self.config.strategyId !== 'autoincrement') {
        item['id'] = self.generateStrategyId();
      }

      let findId = id ? self.config.strategyId === 'autoincrement' ? parseInt(id, 10) : id : undefined;
      if (findId && findId !== item.id) {
        response = self.utils.createErrorResponseOptions(url, STATUS.BAD_REQUEST, `Request id does not match item.id`);
        observer.error(response);
        return;
      } else {
        findId = item.id;
      }
      let requestGet: any;
      if (!findId) {
        requestGet = { result: false, onsuccess: () => {}, onerror: () => {} };
      } else {
        requestGet = objectStore.get(findId);
      }

      requestGet.onsuccess = () => {
        if (!requestGet.result) {
          const transformfn = self.transformPostMap.get(collectionName);
          if (transformfn !== undefined) {
            item = transformfn.call(self, item, self);
          }

          const requestAdd = objectStore.add(item);
          requestAdd.onsuccess = () => {
            if (requestAdd.result) {
              item['id'] = requestAdd.result;
              response = self.utils.createResponseOptions(url, STATUS.CREATED, self.bodify(clone(item)));
              response = response.clone({ headers: response.headers.append('Location', url + '/' + item.id) });
              observer.next(response);
              observer.complete();
            }
          };

          requestAdd.onerror = (event) => {
            response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR,
              {message: `Error to add '${collectionName}' with id='${item.id}'`,
              detailedMessage: (event.target as any).error});
            observer.error(response);
          };
        } else if (self.config.post409) {
          response = self.utils.createErrorResponseOptions(url, STATUS.CONFLICT,
            {message: `'${collectionName}' item with id='${id}' exists and may not be updated with POST.`,
            detailedMessage: 'Use PUT instead.'});
          observer.error(response);
        } else { // if item already exists in collection
          if (!item.id) {
            item['id'] = findId;
          }

          const transformfn = self.transformPutMap.get(collectionName);
          if (transformfn !== undefined) {
            item = transformfn.call(self, requestGet.result, item, self);
          }

          if (self.config.appendExistingPost) {
            item = Object.assign({}, requestGet.result, item);
          }

          const requestPut = objectStore.put(item);
          requestPut.onsuccess = () => {
            response = self.config.post204 ?
              self.utils.createResponseOptions(url, STATUS.NO_CONTENT) :
              self.utils.createResponseOptions(url, STATUS.OK, self.bodify(clone(item)));
            observer.next(response);
            observer.complete();
          };

          requestPut.onerror = (event) => {
            response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR,
              {message: `Error to update '${collectionName}' with id='${id}'`,
              detailedMessage: (event.target as any).error});
            observer.error(response);
          };
        }
      };

      requestGet.onerror = (event) => {
        response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR,
          {message: `Error to find '${collectionName}' with id='${id}'`,
          detailedMessage: (event.target as any).error});
        observer.error(response);
      };

      if (!findId) { // fake request
        requestGet.onsuccess();
      }
    });
  }

  put$(collectionName: string, id: string, item: any, url: string): Observable<any> {
    // tslint:disable-next-line:triple-equals
    if (id == undefined) {
      return throwError(this.utils.createErrorResponseOptions(url, STATUS.NOT_FOUND, `Missing "${collectionName}" id`));
    }

    const findId = this.config.strategyId === 'autoincrement' ? parseInt(id, 10) : id;
    if (item.id && item.id !== findId) {
      return throwError(this.utils.createErrorResponseOptions(url, STATUS.BAD_REQUEST,
        {message: `Request for '${collectionName}' id does not match item.id`,
        detailedMessage: `Don't provide item.id in body or provide same id in both (url, body).`}));
    }

    const self = this;
    return new Observable((observer) => {
      let response: any;
      const objectStore = self.db.transaction(collectionName, 'readwrite').objectStore(collectionName);
      const requestGet = objectStore.get(findId);

      requestGet.onsuccess = () => {
        if (requestGet.result) {
          const transformfn = self.transformPutMap.get(collectionName);
          if (transformfn !== undefined) {
            item = transformfn.call(self, requestGet.result, item, self);
          }

          if (self.config.appendPut) {
            item = Object.assign({}, requestGet.result, item);
          }

          const requestPut = objectStore.put(item);
          requestPut.onsuccess = () => {
            response = self.config.put204 ?
              self.utils.createResponseOptions(url, STATUS.NO_CONTENT) :
              self.utils.createResponseOptions(url, STATUS.OK, self.bodify(clone(item)));
            observer.next(response);
            observer.complete();
          };

          requestPut.onerror = (event) => {
            response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR,
              {message: `Error to update '${collectionName}' with id='${id}'`,
              detailedMessage: (event.target as any).error});
            observer.error(response);
          };

        } else if (self.config.put404) {
          response = self.utils.createErrorResponseOptions(url, STATUS.NOT_FOUND,
            {message: `'${collectionName}' item with id='${id}' not found and may not be created with PUT.`,
            detailedMessage: 'Use POST instead.'});
          observer.error(response);
        } else {
          if (!item.id) {
            item['id'] = findId;
          }

          const transformfn = self.transformPostMap.get(collectionName);
          if (transformfn !== undefined) {
            item = transformfn.call(self, item, self);
          }

          const requestAdd = objectStore.add(item);
          requestAdd.onsuccess = () => {
            if (requestAdd.result) {
              item['id'] = requestAdd.result;
              response = self.utils.createResponseOptions(url, STATUS.CREATED, self.bodify(clone(item)));
              response = response.clone({ headers: response.headers.append('Location', url + '/' + item.id) });
              observer.next(response);
              observer.complete();
            }
          };

          requestAdd.onerror = (event) => {
            response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR,
              {message: `Error to add '${collectionName}' with id='${item.id}'`,
              detailedMessage: (event.target as any).error});
            observer.error(response);
          };
        }
      };

      requestGet.onerror = (event) => {
        response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR,
          {message: `Error to find '${collectionName}' with id='${id}'`,
          detailedMessage: (event.target as any).error});
        observer.error(response);
      };
    });
  }

  delete$(collectionName: string, id: string, url: string): Observable<any> {
    // tslint:disable-next-line:triple-equals
    if (id == undefined) {
      return throwError(this.utils.createErrorResponseOptions(url, STATUS.NOT_FOUND, `Missing "${collectionName}" id`));
    }
    const self = this;
    return new Observable((observer) => {
      const objectStore = self.db.transaction(collectionName, 'readwrite').objectStore(collectionName);
      const findId = self.config.strategyId === 'autoincrement' ? parseInt(id, 10) : id;

      const onsuccess = () => {
        const response = self.utils.createResponseOptions(url, STATUS.NO_CONTENT);
        observer.next(response);
        observer.complete();
      };

      const onerror = (event: Event) => {
        const response = self.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR,
          {message: `Error to delete '${collectionName}' with id='${id}'`,
          detailedMessage: (event.target as any).error});
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
            const response = self.utils.createErrorResponseOptions(url, STATUS.NOT_FOUND,
              {message: `Error to find '${collectionName}' with id='${id}'`, detailedMessage: 'Id não encontrado.'});
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

  private generateStrategyId(): string | number {
    if (this.config.strategyId === 'provided') {
      throw new Error('Id strategy is set as `provided` and id not provided.');
    } else {
      return v4();
    }
  }

  createPassThruBackend(): IPassThruBackend {
    throw new Error('Method not implemented.');
  }
}
