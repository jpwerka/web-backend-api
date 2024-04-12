/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { IndexedDbService, MemoryDbService } from '../../src/data-service';
import { BackendConfig } from '../../src/data-service/backend-config';
import { IBackendService, IHttpResponse, IRequestCore, LoadFn } from '../../src/interfaces';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { getDateWithoutSeconds } from '../utils/date-utils';
import { collectionCustomers, customers, ICustomer } from './simple-crud.mock';
import * as cloneDeep from 'clonedeep';

class TransformersFn {
  public static transformePost(customer: ICustomer): ICustomer {
    if (!customer.hasOwnProperty('active')) {
      customer.active = true;
    }
    customer.createdAt = getDateWithoutSeconds();
    return customer;
  }

  public static transformePut(_customer: ICustomer, body: Partial<ICustomer>): ICustomer {
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

  [{ dbtype: 'memory' }, { dbtype: 'indexdb' }].forEach((dbType) => {
    let dbService: MemoryDbService | IndexedDbService;
    const backendConfig = new BackendConfig({
      apiBase: '/',
      put204: false,
      returnItemIn201: true,
      delay: 0
    })

    beforeAll(async () => {
      if (dbType.dbtype === 'memory') {
        dbService = new MemoryDbService(backendConfig);
      } else {
        dbService = new IndexedDbService(backendConfig);
      }
      configureBackendUtils(dbService);
      await dbService.createDatabase();
      await dbService.createObjectStore(dataServiceFn);
    });

    afterAll(async () => {
      if (dbService instanceof IndexedDbService) {
        dbService.closeDatabase();
      }
      await dbService.deleteDatabase();
    })

    beforeEach((done) => {
      void (async (): Promise<void> => {
        await dbService.clearData(collectionCustomers);
        for (const customer of customers) {
          await dbService.storeData(collectionCustomers, TransformersFn.transformePost(cloneDeep(customer)));
        }
      })().then(() => done());
    })

    it(`Deve atualizar um registro existente via POST. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const expectedCustomer = TransformersFn.transformePut(null, TransformersFn.transformePost(cloneDeep(customers[0])));
      expectedCustomer.name = 'Cliente 01 nome alterado';
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}/1`,
        body: {
          name: 'Cliente 01 nome alterado'
        }
      };
      const spyPut$ = jest.spyOn(TransformersFn, 'transformePut');
      // when
      dbService.handleRequest<ICustomer>(req).then(
        (response: IHttpResponse<ICustomer>) => {
          // then
          expect(spyPut$).toHaveBeenCalled();
          expect(response.body).toEqual(expectedCustomer);
          done();
        },
        error => done(error)
      );
    });

    it(`Deve criar um registro novo mesmo com PUT. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const putCustomer: ICustomer = {
        id: 99,
        name: 'Novo cliente 99',
      };
      const expectedCustomer = TransformersFn.transformePost(cloneDeep(putCustomer));
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'PUT',
        url: `http://localhost/${collectionCustomers}/99`,
        body: putCustomer
      };
      const spyPost$ = jest.spyOn(TransformersFn, 'transformePost');
      // when
      dbService.handleRequest<ICustomer>(req).then(
        (response: IHttpResponse<ICustomer>) => {
          // then
          expect(spyPost$).toHaveBeenCalled();
          expect(response.body).toEqual(expectedCustomer);
          done();
        },
        error => done(error)
      );
    });

  });

});

