/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { v4 } from 'uuid';
import { IndexedDbService, MemoryDbService } from '../../src/data-service';
import { BackendConfig } from '../../src/data-service/backend-config';
import { IBackendService, IHttpResponse, IRequestCore, LoadFn } from '../../src/interfaces';
import { STATUS } from '../../src/utils';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { collectionCustomers, customers as customersOrigem } from './simple-crud.mock';

export interface ICustomer {
  id?: string;
  name: string;
}

const customers = customersOrigem.map<ICustomer>(c => ({ id: v4(), name: c.name }));

const dataServiceFn = new Map<string, LoadFn[]>();

dataServiceFn.set(collectionCustomers, [(dbService: IBackendService) => {

  for (const customer of customers) {
    void dbService.storeData(collectionCustomers, customer).then(() => null);
  }
}]);

describe('Testes de uma aplicação CRUD com comandos POST e PUT sem retorno de body', () => {

  [{ dbtype: 'memory' }, { dbtype: 'indexdb' }].forEach((dbType) => {
    let dbService: MemoryDbService | IndexedDbService;
    const backendConfig = new BackendConfig({
      apiBase: '/',
      strategyId: 'uuid',
      appendExistingPost: false,
      appendPut: false,
      returnItemIn201: false,
      put204: true,
      delay: 0
    })

    beforeAll(async () => {
      if (dbType.dbtype === 'memory') {
        dbService = new MemoryDbService(backendConfig);
      } else {
        dbService = new IndexedDbService(backendConfig);
      }
      configureBackendUtils(dbService);
      await dbService.createDatabase()
      await dbService.createObjectStore(dataServiceFn);
    });

    afterAll(async () => {
      if (dbService instanceof IndexedDbService) {
        dbService.closeDatabase();
      }
      await dbService.deleteDatabase();
    })

    it(`Deve retornar o location com o ID ao ser CREATED com POST e sem body. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}`,
        body: {
          name: 'Cliente criado com POST'
        }
      };
      // when
      dbService.handleRequest<void>(req).then(
        (response: (IHttpResponse<void> & { location?: string })) => {
          expect(response.status).toEqual(STATUS.CREATED);
          expect(response.body).toBeUndefined();
          expect(response.location).toContain('Location ID:');
          done();
        },
        (erro) => done(erro)
      );
    });

    it(`Deve retornar o location com o ID ao ser CREATED com PUT e sem body. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const id = v4();
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'PUT',
        url: `http://localhost/${collectionCustomers}/${id}`,
        body: {
          name: 'Cliente criado com PUT'
        }
      };
      // when
      dbService.handleRequest<void>(req).then(
        (response: (IHttpResponse<void> & { location?: string })) => {
          expect(response.status).toEqual(STATUS.CREATED);
          expect(response.body).toBeUndefined();
          expect(response.location).toEqual(`Location ID: ${id}`);
          done();
        },
        (erro) => done(erro)
      );
    });

    it(`Deve retornar NO_CONTENT ao atualizar com POST e sem body. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}/${customers[4].id}`,
        body: {
          name: 'Cliente atualizado com POST'
        }
      };
      // when
      dbService.handleRequest<void>(req).then(
        (response: IHttpResponse<void>) => {
          expect(response.status).toEqual(STATUS.NO_CONTENT);
          expect(response.body).toBeUndefined();
          done();
        },
        (erro) => done(erro)
      );
    });

    it(`Deve retornar NO_CONTENT ao atualizar com PUT e sem body. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'PUT',
        url: `http://localhost/${collectionCustomers}/${customers[0].id}`,
        body: {
          name: 'Cliente atualizado com PUT'
        }
      };
      // when
      dbService.handleRequest<void>(req).then(
        (response: IHttpResponse<void>) => {
          expect(response.status).toEqual(STATUS.NO_CONTENT);
          expect(response.body).toBeUndefined();
          done();
        },
        (erro) => done(erro)
      );
    });

  });

});

