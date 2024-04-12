/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { IndexedDbService, MemoryDbService } from '../../src/data-service';
import { BackendConfig } from '../../src/data-service/backend-config';
import { IHttpErrorResponse, IHttpResponse, IRequestCore, LoadFn } from '../../src/interfaces';
import { STATUS } from '../../src/utils';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { collectionCustomers, ICustomer } from './simple-crud.mock';

const dataServiceFn = new Map<string, LoadFn[]>();

dataServiceFn.set(collectionCustomers, [() => null]);

describe('Testes de falha de uma aplicação CRUD com exceptions na configuração do ID', () => {

  [{ dbtype: 'memory' }, { dbtype: 'indexdb' }].forEach((dbType) => {
    let dbService: MemoryDbService | IndexedDbService;
    const backendConfig = new BackendConfig({
      apiBase: '/',
      strategyId: 'provided',
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

    it(`Deve retornar erro ao tentar criar um item sem passar o ID. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}`,
        body: {
          name: 'Cliente sem ID informado'
        }
      };
      // when
      dbService.handleRequest(req).then(
        () => done('Do not have return in Promise.thenin this request'),
        (erro: IHttpErrorResponse) => {
          // then
          expect(erro.status).toEqual(STATUS.BAD_REQUEST);
          expect(erro.error).toEqual('Id strategy is set as `provided` and id not provided.');
          done();
        }
      );
    });

  });

  describe('Testes para ID incremental em memória', () => {
    let dbService: MemoryDbService;
    const backendConfig = new BackendConfig({
      apiBase: '/',
      returnItemIn201: true,
      delay: 0
    })

    beforeAll((done) => {
      dbService = new MemoryDbService(backendConfig);
      configureBackendUtils(dbService);
      dbService.createDatabase().then(
        () => dbService.createObjectStore(dataServiceFn).then(
          () => done(),
          error => done(error)
        ),
        error => done(error)
      );
    });

    afterAll((done) => {
      dbService.deleteDatabase().then(
        () => done(),
        (error) => done(error)
      );
    })

    it(`Deve criar um item com ID numérico para uma coleação vazia`, (done) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}`,
        body: {
          name: 'Cliente sem ID informado'
        }
      };
      void dbService.clearData(collectionCustomers);
      // when
      dbService.handleRequest<ICustomer>(req).then(
        // then
        (response: IHttpResponse<ICustomer>) => {
          expect(response.body).toEqual({ id: 1, name: 'Cliente sem ID informado' });
          done();
        },
        (erro) => done(erro)
      );
    });

    it(`Deve retornar erro ao tentar criar um item com ID numérico, sem saber como incrementar`, (done) => {
      void (async (): Promise<void> => {
        await dbService.clearData(collectionCustomers);
        await dbService.storeData(collectionCustomers, { id: '123ABC', name: 'Cliente com ID alphanumérico' });
      })().then(() => {
        // given
        const req: IRequestCore<Partial<ICustomer>> = {
          method: 'POST',
          url: `http://localhost/${collectionCustomers}`,
          body: {
            name: 'Cliente sem ID informado'
          }
        };
        // when
        dbService.handleRequest(req).then(
          () => done('Do not have return in Promise.thenin this request'),
          (erro: IHttpErrorResponse) => {
            // then
            const message = `Collection ${collectionCustomers} id type is non-numeric or unknown. Can only generate numeric ids.`;
            expect(erro.status).toEqual(STATUS.BAD_REQUEST);
            expect(erro.error).toEqual(message);
            done();
          }
        );
      });
    });

  });

});

