import { HttpRequest } from '@angular/common/http';
import { TestCase } from 'jasmine-data-provider-ts';
import { BackendConfig } from '../../src/lib/data-service/backend-config';
import { HttpClientBackendService } from '../../src/lib/http-client-backend.service';
import { BackendTypeArgs, IBackendService, IHttpErrorResponse, IndexedDbService, LoadFn, MemoryDbService, STATUS } from '../../src/public-api';
import { collectionCustomers, customers, ICustomer } from './http-client-backend.mock';

const dataServiceFn = new Map<string, LoadFn[]>();

dataServiceFn.set(collectionCustomers, [(dbService: IBackendService) => {

  for (const customer of customers) {
    void dbService.storeData(collectionCustomers, customer).then(() => null);
  }
}]);

xdescribe('Testes de falha de uma aplicação CRUD com excptions nas funções de transformer', () => {

  TestCase<BackendTypeArgs>([{ dbtype: 'memory' }, { dbtype: 'indexdb' }], (dbType) => {
    let httpService: HttpClientBackendService;
    let dbService: MemoryDbService | IndexedDbService;
    const backendConfig = new BackendConfig({
      strategyId: 'provided',
      appendExistingPost: false,
      appendPut: false,
      delay: 0
    })

    beforeAll((done: DoneFn) => {
      if (dbType.dbtype === 'memory') {
        dbService = new MemoryDbService(backendConfig);
      } else {
        dbService = new IndexedDbService(backendConfig);
      }
      httpService = new HttpClientBackendService(dbService, null)
      // configureBackendUtils(dbService);
      dbService.createDatabase().then(
        () => dbService.createObjectStore(dataServiceFn).then(
          () => done(),
          error => done.fail(error)
        ),
        error => done.fail(error)
      );
    });

    afterAll((done: DoneFn) => {
      if (dbService instanceof IndexedDbService) {
        dbService.closeDatabase();
      }
      dbService.deleteDatabase().then(
        () => done(),
        (error) => done.fail(error)
      );
    })

    beforeEach(() => {
      dbService.clearTransformGetBothMap(collectionCustomers);
      dbService.clearTransformPostMap(collectionCustomers);
      dbService.clearTransformPutMap(collectionCustomers);
    })

    it(`Deve retornar erro ao fazer POST e ser lançado exception por não ter provido ID. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const postCustumer: ICustomer = {
        name: 'Cliente criado sem ID'
      };
      const req: HttpRequest<ICustomer> = new HttpRequest<ICustomer>(
        'POST',
        `http:://localhost/${collectionCustomers}`,
        postCustumer
      );
      const responseError = {
        url: collectionCustomers,
        status: STATUS.BAD_REQUEST,
        error: 'Erro no TransformGetById'
      } as IHttpErrorResponse;
      // when
      httpService.handle(req).subscribe({
        next: () => done.fail('Do not have return in Observable.next in this request'),
        error: (erro: IHttpErrorResponse) => {
          expect(erro).toEqual(responseError);
          done();
        }
      });
    });

  });

});

