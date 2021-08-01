import { BackendConfig } from '../../src/lib/data-service/backend-config';
import { IBackendService, IHttpErrorResponse, IHttpResponse, IRequestCore, LoadFn, MemoryDbService, STATUS } from '../../src/public-api';
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

  it('Deve lançar erro ao tentar adicionar interceptor via string com JSON inválido', () => {
    const intercetor = `{
      path: 'qualquer',
      applyToPath: 'afterId',
      response: [errorInJson}]
    }`;
    expect(() => dbService.addRequestInterceptorByValue(intercetor))
      .toThrowError(/O valor informado não é possível de ser interpretado como uma interface IRequestInterceptor/);
  });

  it('Deve lançar erro ao tentar adicionar interceptor sem informação minima obrigatória', () => {
    const intercetor = {
      path: 'qualquer'
    };
    expect(() => dbService.addRequestInterceptorByValue(intercetor))
      .toThrowError('O valor informado não é possível de ser interpretado como uma interface IRequestInterceptor');
  });

  it('Deve lançar erro ao tentar adicionar um interceptor que não seja caminho completo sem a coleção', () => {
    const intercetor = {
      path: 'qualquer',
      applyToPath: 'afterId',
      response: { status: STATUS.INTERNAL_SERVER_ERROR }
    };
    expect(() => dbService.addRequestInterceptorByValue(intercetor))
      .toThrowError('For no complete interceptor paths, must be informed collectionName in interceptor.');
  });

  it('Deve responder a interceptor com um path completo', (done: DoneFn) => {
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
    dbService.handleRequest(req).subscribe(
      (response: IHttpResponse<IUser>) => {
        // then
        expect(response.body).toEqual(user);
        done();
      },
      error => done.fail(error)
    );
  });

  it('Deve responder com um erro, caso o response contenha a propriedade error', (done: DoneFn) => {
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
    dbService.handleRequest(req).subscribe(
      () => done.fail('Não deve retornar no Observable.next'),
      (error: IHttpErrorResponse) => {
        // then
        expect(error.status).toEqual(STATUS.INTERNAL_SERVER_ERROR);
        expect(error.error).toEqual({ message: 'Internal server error' });
        done();
      },
    );
  });

  it('Deve responder OK, com o conteúdo do BODY', (done: DoneFn) => {
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
    dbService.handleRequest(req).subscribe(
      (response: IHttpResponse<{ property1: string }>) => {
        // then
        expect(response.status).toEqual(STATUS.OK);
        expect(response.body).toEqual({ property1: 'value1' });
        done();
      },
      error => done.fail(error)
    );
  });

  it('Deve responder NO_CONTENT, caso o response não contenha o BODY nem o STATUS', (done: DoneFn) => {
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
    dbService.handleRequest(req).subscribe(
      (response: IHttpResponse<null>) => {
        // then
        expect(response.status).toEqual(STATUS.NO_CONTENT);
        expect(response.body).toEqual({});
        done();
      },
      error => done.fail(error)
    );
  });

  it('Deve processar um interceptor completo via path param com String', (done: DoneFn) => {
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
    dbService.handleRequest(req1).subscribe(
      (response: IHttpResponse<unknown>) => {
        // then
        expect(response.status).toEqual(STATUS.OK);
        done();
      },
      error => done.fail(error)
    );
  });

  it('Deve processar um interceptor completo via path param com Map', (done: DoneFn) => {
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
    dbService.handleRequest(req1).subscribe(
      (response: IHttpResponse<unknown>) => {
        // then
        expect(response.status).toEqual(STATUS.MULTIPLE_CHOICES);
        done();
      },
      error => done.fail(error)
    );
  });

  it('Deve processar um interceptor completo via path param com Objeto', (done: DoneFn) => {
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
    dbService.handleRequest(req1).subscribe(
      (response: IHttpResponse<unknown>) => {
        // then
        expect(response.status).toEqual(STATUS.OK);
        done();
      },
      error => done.fail(error)
    );
  });

  it('Deve processar um interceptor para uma coleção mesmo sendo passado via value', (done: DoneFn) => {
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
    dbService.handleRequest(req1).subscribe(
      (response: IHttpResponse<unknown>) => {
        // then
        expect(response.body).toEqual(customers[0]);
        expect(response.status).toEqual(STATUS.NOT_MODIFIED);
        done();
      },
      error => done.fail(error)
    );
  });


});
