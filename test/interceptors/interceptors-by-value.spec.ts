/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { MemoryDbService } from '../../src/data-service';
import { BackendConfig } from '../../src/data-service/backend-config';
import { IBackendService, IHttpErrorResponse, IRequestCore, LoadFn } from '../../src/interfaces';
import { STATUS } from '../../src/utils';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { collectionCustomers, customers } from './interceptors.mock';

const dataServiceFn = new Map<string, LoadFn[]>();
dataServiceFn.set(collectionCustomers, [(dbService: IBackendService) => {

  customers.forEach(customer => {
    void dbService.storeData(collectionCustomers, customer).then(() => null);
  })
}]);

describe('Testes para cenários de intercptação de respostas via objeto', () => {

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

  it('Deve lançar erro ao tentar adicionar interceptor via string com JSON inválido', () => {
    const intercetor = `{
      path: 'qualquer',
      applyToPath: 'afterId',
      response: [errorInJson}]
    }`;
    expect(() => dbService.addRequestInterceptorByValue(intercetor))
      .toThrow(/O valor informado não é possível de ser interpretado como uma interface IRequestInterceptor/);
  });

  it('Deve lançar erro ao tentar adicionar interceptor sem informação minima obrigatória', () => {
    const intercetor = {
      path: 'qualquer'
    };
    expect(() => dbService.addRequestInterceptorByValue(intercetor))
      .toThrow('O valor informado não é possível de ser interpretado como uma interface IRequestInterceptor');
  });

  it('Deve lançar erro ao tentar adicionar um interceptor que não seja caminho completo sem a coleção', () => {
    const intercetor = {
      path: 'qualquer',
      applyToPath: 'afterId',
      response: { status: STATUS.INTERNAL_SERVER_ERROR }
    };
    expect(() => dbService.addRequestInterceptorByValue(intercetor))
      .toThrow('For no complete interceptor paths, must be informed collectionName in interceptor.');
  });

  it('Deve responder a interceptor com um path completo', async () => {
    // given
    interface IUser { userId: number, userName: string }
    const user: IUser = { userId: 1, userName: 'Fulano de tal' };
    const intercetor = {
      path: 'api/users/1',
      response: { status: STATUS.OK, body: user }
    };
    dbService.addRequestInterceptorByValue(intercetor);
    const req: IRequestCore<null> = {
      method: 'GET',
      url: `/api/users/1`
    };
    // when
    const response = await dbService.handleRequest<IUser>(req);
    // then
    expect(response.body).toEqual(user);
  });

  it('Deve responder com um erro, caso o response contenha a propriedade error', (done) => {
    // given
    const intercetor = {
      path: 'api/v5/error',
      response: { statusCode: STATUS.INTERNAL_SERVER_ERROR, error: { message: 'Internal server error' } }
    };
    dbService.addRequestInterceptorByValue(intercetor);
    const req: IRequestCore<null> = {
      method: 'GET',
      url: `api/v5/error`
    };
    // when
    dbService.handleRequest(req).then(
      () => done('Não deve retornar no Promise.then'),
      (error: IHttpErrorResponse) => {
        // then
        expect(error.status).toEqual(STATUS.INTERNAL_SERVER_ERROR);
        expect(error.error).toEqual({ message: 'Internal server error' });
        done();
      },
    );
  });

  it('Deve responder OK, com o conteúdo do BODY', async () => {
    // given
    const intercetor = {
      path: 'api/response/withBody',
      response: { body: { property1: 'value1' } }
    };
    dbService.addRequestInterceptorByValue(intercetor);
    const req: IRequestCore<null> = {
      method: 'GET',
      url: 'api/response/withBody',
    };
    // when
    const response = await dbService.handleRequest<{ property1: string }>(req);
    // then
    expect(response.status).toEqual(STATUS.OK);
    expect(response.body).toEqual({ property1: 'value1' });
  });

  it('Deve responder NO_CONTENT, caso o response não contenha o BODY nem o STATUS', async () => {
    // given
    const intercetor = {
      path: 'api/response/nobody',
      response: {}
    };
    dbService.addRequestInterceptorByValue(intercetor);
    const req: IRequestCore<null> = {
      method: 'GET',
      url: 'api/response/nobody',
    };
    // when
    const response = await dbService.handleRequest(req);
    // then
    expect(response.status).toEqual(STATUS.NO_CONTENT);
    expect(response.body).toEqual({});
  });

  it('Deve processar um interceptor completo via path param com String', async () => {
    // given
    const intercetor = {
      method: 'GET',
      path: 'api/v1/documents/:id',
      queryStringParameters: 'param1=value1&param2=value2',
      response: { status: STATUS.OK }
    };
    dbService.addRequestInterceptorByValue(intercetor);
    const req1: IRequestCore<null> = {
      method: 'GET',
      url: 'api/v1/documents/123456789?param1=value1&param2=value2'
    };
    // when
    const response = await dbService.handleRequest(req1);
    // then
    expect(response.status).toEqual(STATUS.OK);
  });

  it('Deve processar um interceptor completo via path param com Map', async () => {
    // given
    const intercetor = {
      method: 'GET',
      path: 'api/v1/multiValueParam/values',
      query: new Map<string, string[]>().set('multiValueParam', ['value1', 'value2']),
      response: { statusCode: STATUS.MULTIPLE_CHOICES }
    };
    dbService.addRequestInterceptorByValue(intercetor);
    const req1: IRequestCore<null> = {
      method: 'GET',
      url: 'api/v1/multiValueParam/values?multiValueParam=value1&multiValueParam=value2'
    };
    // when
    const response = await dbService.handleRequest(req1);
    // then
    expect(response.status).toEqual(STATUS.MULTIPLE_CHOICES);
  });

  it('Deve processar um interceptor completo via path param com Objeto', async () => {
    // given
    const intercetor = {
      method: 'GET',
      path: 'api/v1/documents/:id',
      query: { param1: 'value1', param2: 'value2' },
      response: { status: STATUS.OK }
    };
    dbService.addRequestInterceptorByValue(intercetor);
    const req1: IRequestCore<null> = {
      method: 'GET',
      url: 'api/v1/documents/123456789?param1=value1&param2=value2'
    };
    // when
    const response = await dbService.handleRequest(req1);
    // then
    expect(response.status).toEqual(STATUS.OK);
  });

  it('Deve processar um interceptor para uma coleção mesmo sendo passado via value', async () => {
    // given
    const intercetor = `{
      "method": "GET",
      "path": "api/v1/customers/:id",
      "collectionName": "${collectionCustomers}",
      "response": { "status": 304, "body": ${JSON.stringify(customers[0])} }
    }`;
    dbService.addRequestInterceptorByValue(intercetor);
    const req1: IRequestCore<null> = {
      method: 'GET',
      url: 'api/v1/customers/99'
    };
    // when
    const response = await dbService.handleRequest(req1);
    // then
    expect(response.body).toEqual(customers[0]);
    expect(response.status).toEqual(STATUS.NOT_MODIFIED);
  });

});
