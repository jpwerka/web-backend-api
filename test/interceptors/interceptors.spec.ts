/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { MemoryDbService } from '../../src/data-service';
import { BackendConfig } from '../../src/data-service/backend-config';
import { IBackendService, IHttpErrorResponse, IInterceptorUtils, IRequestCore, IRequestInterceptor, LoadFn } from '../../src/interfaces';
import { STATUS } from '../../src/utils';
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

  beforeAll(async () => {
    dbService = new MemoryDbService(new BackendConfig({
      apiBase: 'api/v1',
      host: 'myhost.com',
      delay: 0,
      put204: false,
      returnItemIn201: true
    }));
    configureBackendUtils(dbService);
    await dbService.createDatabase();
    await dbService.createObjectStore(dataServiceFn);
  });

  it('Deve responder a interceptor com um path completo', async () => {
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
    const response = await dbService.handleRequest<IUser>(req);
    // then
    expect(response.body).toEqual(user);
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
      .toThrow('For no complete interceptor paths, must be informed collectionName in interceptor.');
  });

  it('Deve responder a interceptor depois do ID respondendo com uma Promise', async () => {
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
    const response = await dbService.handleRequest<ICustomer>(req);
    // then
    expect(response.body).toEqual(expectedCustomer);
  });

  it('Deve responder a um interceptor com path vazio, aplicando replace path', async () => {
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
    const response = await dbService.handleRequest<{ interceptdCustomers: ICustomer[]}>(req);
    // then
    expect(response.body).toEqual({ interceptdCustomers: customers });
  });

  it('Deve processar um interceptor mas retornar pela biblioteca, quando intercetor retornar undefined', async () => {
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
    const mockFn = jest.spyOn(TestInterceptorUndefined, 'process');
    const expectedCustomer = Object.assign({}, customers[4], { active: false, updatedAt, propertyAdd: 'Add via PUT in Lib' });
    dbService.addRequestInterceptor(intercetor);
    const req: IRequestCore<Partial<ICustomer> & { propertyAdd: string }> = {
      method: 'PUT',
      url: `/api/v1/core/customers/5`,
      body: Object.assign({}, customers[4], { active: false, updatedAt, propertyAdd: 'Add via PUT in Lib' })
    };
    // when
    const response = await dbService.handleRequest<ICustomer & { propertyAdd: string }>(req);
    // then
    expect(response.body).toEqual(expectedCustomer);
    expect(mockFn).toHaveBeenCalledTimes(1);
    const args = mockFn.mock.calls[0][0];
    expect(args.url).toEqual('/api/v1/core/customers/5');
    dbService.clearReplaceUrl(collectionCustomers);
  });

  it('Deve retornar erro quando interceptor retornar a propriedade error na resposta', (done) => {
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
    dbService.handleRequest(req).then(
      () => done('Não deve retornar no Promise.then'),
      (error: IHttpErrorResponse) => {
        // then
        expect(error.status).toEqual(STATUS.BAD_REQUEST);
        expect(error.error).toEqual({ message: 'Erro do interceptor' });
        done();
      },
    );
  });

  it('Deve retornar erro quando interceptor lançar throwError na resposta', (done) => {
    // given
    const intercetor: IRequestInterceptor = {
      method: 'POST',
      path: 'throwError',
      collectionName: collectionCustomers,
      applyToPath: 'beforeId',
      response: (utils: IInterceptorUtils) => {
        throw utils.fn.errorResponse(utils.url, STATUS.METHOD_NOT_ALLOWED, { message: 'ThrowError do interceptor' });
      }
    };
    dbService.addRequestInterceptor(intercetor);
    const req: IRequestCore<null> = {
      method: 'POST',
      url: `/api/v1/customers/throwError`,
    };
    // when
    dbService.handleRequest(req).then(
      () => done('Não deve retornar no Promise.then'),
      (error: IHttpErrorResponse) => {
        // then
        expect(error.status).toEqual(STATUS.METHOD_NOT_ALLOWED);
        expect(error.error).toEqual({ message: 'ThrowError do interceptor' });
        done();
      },
    );
  });

  it('Deve processar um interceptor completo parseando os ids entre chaves', async () => {
    // given
    const intercetor: IRequestInterceptor = {
      method: 'GET',
      path: 'api/parent/{parentId}/child/{childId}/action',
      applyToPath: 'complete',
      response: (utils: IInterceptorUtils) => {
        return utils.fn.response(utils.url, STATUS.OK, { interceptorIds: [...utils.interceptorIds] });
      }
    };
    dbService.addRequestInterceptor(intercetor);
    const req: IRequestCore<null> = {
      method: 'GET',
      url: 'api/parent/123/child/456/action'
    };
    // when
    const response = await dbService.handleRequest<{ interceptorIds: string[] }>(req);
    // then
    expect(response.body).toEqual({ interceptorIds: ['123', '456'] });
  });

  it('Deve processar um interceptor completo parseando os ids pelo :id', async () => {
    // given
    const intercetor: IRequestInterceptor = {
      method: 'DELETE',
      path: ':id/sub-collection/:id/detete',
      applyToPath: 'beforeId',
      collectionName: collectionCustomers,
      response: (utils: IInterceptorUtils) => {
        return utils.fn.response(utils.url, STATUS.OK, { interceptorIds: [...utils.interceptorIds] });
      }
    };
    dbService.addRequestInterceptor(intercetor);
    const req: IRequestCore<null> = {
      method: 'DELETE',
      url: 'api/v1/customers/123/sub-collection/456/detete'
    };
    // when
    const response = await dbService.handleRequest<{ interceptorIds: string[] }>(req);
    // then
    expect(response.body).toEqual({ interceptorIds: ['123', '456'] });
  });

  it('Deve processar um interceptor completo ignorando um path coringa', async () => {
    // given
    const intercetor: IRequestInterceptor = {
      method: 'GET',
      path: 'api/interceptors/:id/**/:id/action',
      applyToPath: 'complete',
      response: (utils: IInterceptorUtils) => {
        return utils.fn.response(utils.url, STATUS.OK, { interceptorIds: [...utils.interceptorIds] });
      }
    };
    dbService.addRequestInterceptor(intercetor);
    const req1: IRequestCore<null> = {
      method: 'GET',
      url: 'api/interceptors/123/um-path-coringa/456/action'
    };
    // when
    let response = await dbService.handleRequest<{ interceptorIds: string[] }>(req1);
    // then
    expect(response.body).toEqual({ interceptorIds: ['123', '456'] });
    const req2: IRequestCore<null> = {
      method: 'GET',
      url: 'api/interceptors/987/outro-path-coringa/654/action'
    };
    response = await dbService.handleRequest(req2);
    // then
    expect(response.body).toEqual({ interceptorIds: ['987', '654'] });
  });

  it('Deve processar um interceptor parcial depois do ID ignorando um path coringa via path param', async () => {
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
          interceptorIds: [...utils.interceptorIds],
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
    let response = await dbService.handleRequest(req1);
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
    // when
    response = await dbService.handleRequest(req2);
    // then
    expect(response.body).toEqual({
      id: '987',
      interceptorIds: ['654'],
      query: new Map<string, string[]>().set('param1', ['value1']).set('param2', ['value2'])
    });
    dbService.clearReplaceUrl(collectionCustomers);
  });

  it('Deve processar um interceptor completo via path param com Map', async () => {
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
    const response = await dbService.handleRequest(req1);
    // then
    expect(response.body).toEqual({
      interceptorIds: [],
      query: new Map<string, string[]>().set('ignoredParam', ['ignoredValue']).set('multiValueParam', ['value1', 'value2'])
    });
  });

  it('Deve processar um interceptor completo via path param com Objeto', async () => {
    // given
    const intercetor: IRequestInterceptor = {
      method: 'GET',
      path: 'api/v1/documents/:id',
      query: { param1: 'value1', param2: 'value2' },
      response: (utils: IInterceptorUtils) => {
        return utils.fn.response(utils.url, STATUS.OK, {
          interceptorIds: [...utils.interceptorIds],
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
    const response = await dbService.handleRequest(req1)
    // then
    expect(response.body).toEqual({
      interceptorIds: ['123456789'],
      query: new Map<string, string[]>().set('param1', ['value1']).set('param2', ['value2'])
    });
  });

});
