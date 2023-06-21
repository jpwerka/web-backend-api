/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { cloneDeep } from 'lodash';
import { throwError } from 'rxjs';
import { BackendConfig } from '../../database/src/data-service/backend-config';
import { IBackendService, IHttpErrorResponse, IHttpResponse, IInterceptorUtils, IRequestCore, IRequestInterceptor, LoadFn, MemoryDbService, STATUS } from '../../public-api';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { ICustomer, collectionCustomers, customers } from './interceptors.mock';

const dataServiceFn = new Map<string, LoadFn[]>();
dataServiceFn.set(collectionCustomers, [(dbService: IBackendService) => {

  customers.forEach(customer => {
    void dbService.storeData(collectionCustomers, customer).then(() => null);
  })
}]);

describe('Testes para cenários de intercptação de respostas', () => {

  let dbService: MemoryDbService;

  beforeAll((done: DoneFn) => {
    dbService = new MemoryDbService(new BackendConfig({
      apiBase: 'api/v1',
      host: 'myhost.com',
      delay: 0,
      put204: false,
      returnItemIn201: true
    }));
    configureBackendUtils(dbService);
    dbService.createDatabase().then(
      () => dbService.createObjectStore(dataServiceFn).then(
        () => done(),
        error => done.fail(error)
      ),
      error => done.fail(error)
    );
  });

  it('Deve responder a interceptor com um path completo', (done: DoneFn) => {
    // given
    interface IUser { userId: number, userName: string }
    const user: IUser = { userId: 1, userName: 'Fulano de tal' };
    const intercetor: IRequestInterceptor = {
      path: 'api/users/1',
      response: (utils: IInterceptorUtils) => {
        return utils.fn.response(utils.url, STATUS.OK, user);
      }
    };
    dbService.addRequestInterceptor(intercetor);
    const req: IRequestCore<null> = {
      method: 'GET',
      url: `/api/users/1`
    };
    // when
    dbService.handleRequest(req).subscribe(
      (response: IHttpResponse<IUser>) => {
        // then
        expect(response.body).toEqual(user);
        done();
      },
      error => done.fail(error)
    );
  });

  it('Deve lançar erro ao tentar adicionar um interceptor que não seja caminho completo sem a coleção', () => {
    const intercetor: IRequestInterceptor = {
      path: 'qualquer',
      applyToPath: 'afterId',
      response: (utils: IInterceptorUtils) => {
        return utils.fn.errorResponse(utils.url, STATUS.INTERNAL_SERVER_ERROR);
      }
    };
    expect(() => dbService.addRequestInterceptor(intercetor))
      .toThrowError('For no complete interceptor paths, must be informed collectionName in interceptor.');
  });

  it('Deve responder a interceptor depois do ID respondendo com um Observable', (done: DoneFn) => {
    // given
    const updatedAt = new Date();
    const intercetor: IRequestInterceptor = {
      method: 'POST',
      path: 'inativar',
      collectionName: collectionCustomers,
      applyToPath: 'afterId',
      response: (utils: IInterceptorUtils) => {
        return dbService.put$(collectionCustomers, customers[0].id.toString(), { active: false, updatedAt }, utils.url);
      }
    };
    dbService.addRequestInterceptor(intercetor);
    const req: IRequestCore<null> = {
      method: 'POST',
      url: `/api/v1/customers/1/inativar`
    };
    const expectedCustomer = Object.assign({}, customers[0], { active: false, updatedAt });
    // when
    dbService.handleRequest(req).subscribe(
      (response: IHttpResponse<ICustomer>) => {
        // then
        expect(response.body).toEqual(expectedCustomer);
        done();
      },
      error => done.fail(error)
    );
  });

  it('Deve responder a um interceptor com path vazio, aplicando replace path', (done: DoneFn) => {
    // given
    dbService.addReplaceUrl(collectionCustomers, 'query/customers');
    const intercetor: IRequestInterceptor = {
      method: 'GET',
      path: '',
      collectionName: collectionCustomers,
      applyToPath: 'beforeId',
      response: (utils: IInterceptorUtils) => {
        return utils.fn.response(utils.url, STATUS.OK, { interceptdCustomers: customers });
      }
    };
    dbService.addRequestInterceptor(intercetor);
    const req: IRequestCore<null> = {
      method: 'GET',
      url: `/api/v1/query/customers`
    };
    // when
    dbService.handleRequest(req).subscribe(
      (response: IHttpResponse<{ interceptdCustomers: ICustomer[] }>) => {
        // then
        expect(response.body).toEqual({ interceptdCustomers: customers });
        dbService.clearReplaceUrl(collectionCustomers);
        done();
      },
      error => done.fail(error)
    );
  });

  it('Deve processar um interceptor mas retornar pela biblioteca, quando intercetor retornar undefined', (done: DoneFn) => {
    // given
    class TestInterceptorUndefined {
      static process(utils: IInterceptorUtils): void {
        console.log('[PROCCES INTERCEPTOR]', utils.url);
      }
    }
    const updatedAt = new Date();
    dbService.addReplaceUrl(collectionCustomers, ['core', 'customers']);
    const intercetor: IRequestInterceptor = {
      method: 'PUT',
      path: '',
      collectionName: collectionCustomers,
      applyToPath: 'afterId',
      response: (utils: IInterceptorUtils) => {
        TestInterceptorUndefined.process(utils);
        return undefined;
      }
    };
    spyOn(TestInterceptorUndefined, 'process').and.callThrough();
    const expectedCustomer = Object.assign({}, customers[4], { active: false, updatedAt, propertyAdd: 'Add via PUT in Lib' });
    dbService.addRequestInterceptor(intercetor);
    const req: IRequestCore<Partial<ICustomer> & { propertyAdd: string }> = {
      method: 'PUT',
      url: `/api/v1/core/customers/5`,
      body: Object.assign({}, customers[4], { active: false, updatedAt, propertyAdd: 'Add via PUT in Lib' })
    };
    // when
    dbService.handleRequest(req).subscribe(
      (response: IHttpResponse<ICustomer & { propertyAdd: string }>) => {
        // then
        expect(response.body).toEqual(expectedCustomer);
        expect(TestInterceptorUndefined.process).toHaveBeenCalledWith(jasmine.objectContaining({
          url: '/api/v1/core/customers/5'
        }));
        dbService.clearReplaceUrl(collectionCustomers);
        done();
      },
      error => done.fail(error)
    );
  });

  it('Deve retornar erro quando interceptor retornar a propriedade error na resposta', (done: DoneFn) => {
    // given
    const intercetor: IRequestInterceptor = {
      method: 'POST',
      path: 'error',
      collectionName: collectionCustomers,
      applyToPath: 'beforeId',
      response: (utils: IInterceptorUtils) => {
        return utils.fn.errorResponse(utils.url, STATUS.BAD_REQUEST, { message: 'Erro do interceptor' });
      }
    };
    dbService.addRequestInterceptor(intercetor);
    const req: IRequestCore<null> = {
      method: 'POST',
      url: `/api/v1/customers/error`,
    };
    // when
    dbService.handleRequest(req).subscribe(
      () => done.fail('Não deve retornar no Observable.next'),
      (error: IHttpErrorResponse) => {
        // then
        expect(error.status).toEqual(STATUS.BAD_REQUEST);
        expect(error.error).toEqual({ message: 'Erro do interceptor' });
        done();
      },
    );
  });

  it('Deve retornar erro quando interceptor lançar throwError na resposta', (done: DoneFn) => {
    // given
    const intercetor: IRequestInterceptor = {
      method: 'POST',
      path: 'throwError',
      collectionName: collectionCustomers,
      applyToPath: 'beforeId',
      response: (utils: IInterceptorUtils) => {
        return throwError(utils.fn.errorResponse(utils.url, STATUS.METHOD_NOT_ALLOWED, { message: 'ThrowError do interceptor' }));
      }
    };
    dbService.addRequestInterceptor(intercetor);
    const req: IRequestCore<null> = {
      method: 'POST',
      url: `/api/v1/customers/throwError`,
    };
    // when
    dbService.handleRequest(req).subscribe(
      () => done.fail('Não deve retornar no Observable.next'),
      (error: IHttpErrorResponse) => {
        // then
        expect(error.status).toEqual(STATUS.METHOD_NOT_ALLOWED);
        expect(error.error).toEqual({ message: 'ThrowError do interceptor' });
        done();
      },
    );
  });

  it('Deve processar um interceptor completo parseando os ids entre chaves', (done: DoneFn) => {
    // given
    const intercetor: IRequestInterceptor = {
      method: 'GET',
      path: 'api/parent/{parentId}/child/{childId}/action',
      applyToPath: 'complete',
      response: (utils: IInterceptorUtils) => {
        return utils.fn.response(utils.url, STATUS.OK, { interceptorIds: cloneDeep(utils.interceptorIds) });
      }
    };
    dbService.addRequestInterceptor(intercetor);
    const req: IRequestCore<null> = {
      method: 'GET',
      url: 'api/parent/123/child/456/action'
    };
    // when
    dbService.handleRequest(req).subscribe(
      (response: IHttpResponse<{ interceptorIds: string[] }>) => {
        // then
        expect(response.body).toEqual({ interceptorIds: ['123', '456'] });
        done();
      },
      error => done.fail(error)
    );
  });

  it('Deve processar um interceptor completo parseando os ids pelo :id', (done: DoneFn) => {
    // given
    const intercetor: IRequestInterceptor = {
      method: 'DELETE',
      path: ':id/sub-collection/:id/detete',
      applyToPath: 'beforeId',
      collectionName: collectionCustomers,
      response: (utils: IInterceptorUtils) => {
        return utils.fn.response(utils.url, STATUS.OK, { interceptorIds: cloneDeep(utils.interceptorIds) });
      }
    };
    dbService.addRequestInterceptor(intercetor);
    const req: IRequestCore<null> = {
      method: 'DELETE',
      url: 'api/v1/customers/123/sub-collection/456/detete'
    };
    // when
    dbService.handleRequest(req).subscribe(
      (response: IHttpResponse<{ interceptorIds: string[] }>) => {
        expect(response.body).toEqual({ interceptorIds: ['123', '456'] });
        done();
      },
      error => done.fail(error)
    );
  });

  it('Deve processar um interceptor completo ignorando um path coringa', (done: DoneFn) => {
    // given
    const intercetor: IRequestInterceptor = {
      method: 'GET',
      path: 'api/interceptors/:id/**/:id/action',
      applyToPath: 'complete',
      response: (utils: IInterceptorUtils) => {
        return utils.fn.response(utils.url, STATUS.OK, { interceptorIds: cloneDeep(utils.interceptorIds) });
      }
    };
    dbService.addRequestInterceptor(intercetor);
    const req1: IRequestCore<null> = {
      method: 'GET',
      url: 'api/interceptors/123/um-path-coringa/456/action'
    };
    // when
    dbService.handleRequest(req1).subscribe(
      (response: IHttpResponse<{ interceptorIds: string[] }>) => {
        // then
        expect(response.body).toEqual({ interceptorIds: ['123', '456'] });
        const req2: IRequestCore<null> = {
          method: 'GET',
          url: 'api/interceptors/987/outro-path-coringa/654/action'
        };
        dbService.handleRequest(req2).subscribe(
          (response: IHttpResponse<{ interceptorIds: string[] }>) => {
            expect(response.body).toEqual({ interceptorIds: ['987', '654'] });
            done();
          },
          error => done.fail(error)
        );
      },
      error => done.fail(error)
    );
  });

  it('Deve processar um interceptor parcial depois do ID ignorando um path coringa via path param', (done: DoneFn) => {
    // given
    dbService.addReplaceUrl(collectionCustomers, ['core', 'customers']);
    dbService.addReplaceUrl(collectionCustomers, ['query', 'customers']);
    const intercetor: IRequestInterceptor = {
      method: 'GET',
      path: '**/:id',
      applyToPath: 'afterId',
      collectionName: collectionCustomers,
      query: 'param1=value1&param2=value2',
      response: (utils: IInterceptorUtils) => {
        return utils.fn.response(utils.url, STATUS.OK, {
          id: utils.id,
          interceptorIds: cloneDeep(utils.interceptorIds),
          query: utils.query
        });
      }
    };
    dbService.addRequestInterceptor(intercetor);
    const req1: IRequestCore<null> = {
      method: 'GET',
      url: 'api/v1/core/customers/123/um-path-coringa/456?ignoredParam=ignoredValue&param1=value1&param2=value2'
    };
    // when
    dbService.handleRequest(req1).subscribe(
      (response: IHttpResponse<unknown>) => {
        // then
        expect(response.body).toEqual({
          id: '123',
          interceptorIds: ['456'],
          query: new Map<string, string[]>().set('ignoredParam', ['ignoredValue']).set('param1', ['value1']).set('param2', ['value2'])
        });
        const req2: IRequestCore<null> = {
          method: 'GET',
          url: 'api/v1/query/customers/987/outro-path-coringa/654?param1=value1&param2=value2'
        };
        dbService.handleRequest(req2).subscribe(
          (response: IHttpResponse<unknown>) => {
            expect(response.body).toEqual({
              id: '987',
              interceptorIds: ['654'],
              query: new Map<string, string[]>().set('param1', ['value1']).set('param2', ['value2'])
            });
            dbService.clearReplaceUrl(collectionCustomers);
            done();
          },
          error => done.fail(error)
        );
      },
      error => done.fail(error)
    );
  });

  it('Deve processar um interceptor completo via path param com Map', (done: DoneFn) => {
    // given
    const intercetor: IRequestInterceptor = {
      method: 'GET',
      path: 'api/v1/products/list',
      query: new Map<string, string[]>().set('multiValueParam', ['value1', 'value2']),
      response: (utils: IInterceptorUtils) => {
        return utils.fn.response(utils.url, STATUS.OK, {
          interceptorIds: [],
          query: utils.query
        });
      }
    };
    dbService.addRequestInterceptor(intercetor);
    const req1: IRequestCore<null> = {
      method: 'GET',
      url: 'api/v1/products/list?ignoredParam=ignoredValue&multiValueParam=value1&multiValueParam=value2'
    };
    // when
    dbService.handleRequest(req1).subscribe(
      (response: IHttpResponse<unknown>) => {
        // then
        expect(response.body).toEqual({
          interceptorIds: [],
          query: new Map<string, string[]>().set('ignoredParam', ['ignoredValue']).set('multiValueParam', ['value1', 'value2'])
        });
        done();
      },
      error => done.fail(error)
    );
  });

  it('Deve processar um interceptor completo via path param com Objeto', (done: DoneFn) => {
    // given
    const intercetor: IRequestInterceptor = {
      method: 'GET',
      path: 'api/v1/documents/:id',
      query: { param1: 'value1', param2: 'value2' },
      response: (utils: IInterceptorUtils) => {
        return utils.fn.response(utils.url, STATUS.OK, {
          interceptorIds: cloneDeep(utils.interceptorIds),
          query: utils.query
        });
      }
    };
    dbService.addRequestInterceptor(intercetor);
    const req1: IRequestCore<null> = {
      method: 'GET',
      url: 'api/v1/documents/123456789?param1=value1&param2=value2'
    };
    // when
    dbService.handleRequest(req1).subscribe(
      (response: IHttpResponse<unknown>) => {
        // then
        expect(response.body).toEqual({
          interceptorIds: ['123456789'],
          query: new Map<string, string[]>().set('param1', ['value1']).set('param2', ['value2'])
        });
        done();
      },
      error => done.fail(error)
    );
  });


});
