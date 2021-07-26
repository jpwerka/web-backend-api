import { TestCase } from 'jasmine-data-provider-ts';
import { cloneDeep } from 'lodash-es';
import { BackendConfig } from '../../src/lib/data-service/backend-config';
import { BackendTypeArgs, IBackendService, IHttpResponse, IndexedDbService, IRequestCore, LoadFn, MemoryDbService } from '../../src/public-api';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { getDateWithoutSeconds } from '../utils/date-utils';
import { collectionCustomers, customers, ICustomer } from './simple-crud.mock';

class TransformersFn {
  public static transformePost(customer: ICustomer): ICustomer {
    if (!customer.hasOwnProperty('active')) {
      customer.active = true;
    }
    customer.createdAt = getDateWithoutSeconds();
    return customer;
  }

  public static transformePut(customer: ICustomer, body: Partial<ICustomer>): ICustomer {
    body.updatedAt = getDateWithoutSeconds();
    return body as ICustomer;
  }
}

const dataServiceFn = new Map<string, LoadFn[]>();

dataServiceFn.set(collectionCustomers, [(dbService: IBackendService) => {

  dbService.addTransformPostMap(collectionCustomers,
    (customer: ICustomer): ICustomer => TransformersFn.transformePost(customer));
  dbService.addTransformPutMap(collectionCustomers,
    (customer: ICustomer, body: Partial<ICustomer>): ICustomer => TransformersFn.transformePut(customer, body));

}]);

describe('Testes para uma aplicação CRUD com POST como PUT e PUT como POST', () => {

  TestCase<BackendTypeArgs>([{ dbtype: 'memory' }, { dbtype: 'indexdb' }], (dbType) => {
    let dbService: MemoryDbService | IndexedDbService;
    const backendConfig = new BackendConfig({
      put204: false,
      returnBodyIn201: true,
      delay: 0
    })

    beforeAll((done: DoneFn) => {
      if (dbType.dbtype === 'memory') {
        dbService = new MemoryDbService(backendConfig);
      } else {
        dbService = new IndexedDbService(backendConfig);
      }
      configureBackendUtils(dbService);
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

    beforeEach((done: DoneFn) => {
      void (async (): Promise<void> => {
        await dbService.clearData(collectionCustomers);
        for (const customer of customers) {
          await dbService.storeData(collectionCustomers, TransformersFn.transformePost(cloneDeep(customer)));
        }
      })().then(() => done());
    })

    it(`Deve atualizar um registro existente via POST. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const expectedCustomer = TransformersFn.transformePut(null, TransformersFn.transformePost(cloneDeep(customers[0])));
      expectedCustomer.name = 'Cliente 01 nome alterado';
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http:://localhost/${collectionCustomers}/1`,
        body: {
          name: 'Cliente 01 nome alterado'
        }
      };
      const spyPut$ = spyOn(TransformersFn, 'transformePut').and.callThrough();
      // when
      dbService.handleRequest(req).subscribe(
        (response: IHttpResponse<ICustomer>) => {
          // then
          expect(spyPut$).toHaveBeenCalled();
          expect(response.body).toEqual(expectedCustomer);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve criar um registro novo mesmo com PUT. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const putCustomer: ICustomer = {
        id: 99,
        name: 'Novo cliente 99',
      };
      const expectedCustomer = TransformersFn.transformePost(cloneDeep(putCustomer));
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'PUT',
        url: `http:://localhost/${collectionCustomers}/99`,
        body: putCustomer
      };
      const spyPost$ = spyOn(TransformersFn, 'transformePost').and.callThrough();
      // when
      dbService.handleRequest(req).subscribe(
        (response: IHttpResponse<ICustomer>) => {
          // then
          expect(spyPost$).toHaveBeenCalled();
          expect(response.body).toEqual(expectedCustomer);
          done();
        },
        error => done.fail(error)
      );
    });

  });

});

