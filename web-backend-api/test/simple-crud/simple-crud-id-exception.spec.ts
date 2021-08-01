import { TestCase } from 'jasmine-data-provider-ts';
import { BackendConfig } from '../../src/lib/data-service/backend-config';
import { BackendTypeArgs, IHttpErrorResponse, IHttpResponse, IndexedDbService, IRequestCore, LoadFn, MemoryDbService, STATUS } from '../../src/public-api';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { collectionCustomers, ICustomer } from './simple-crud.mock';

const dataServiceFn = new Map<string, LoadFn[]>();

dataServiceFn.set(collectionCustomers, [() => null]);

describe('Testes de falha de uma aplicação CRUD com exceptions na configuração do ID', () => {

  TestCase<BackendTypeArgs>([{ dbtype: 'memory' }, { dbtype: 'indexdb' }], (dbType) => {
    let dbService: MemoryDbService | IndexedDbService;
    const backendConfig = new BackendConfig({
      strategyId: 'provided',
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

    it(`Deve retornar erro ao tentar criar um item sem passar o ID. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http:://localhost/${collectionCustomers}`,
        body: {
          name: 'Cliente sem ID informado'
        }
      };
      // when
      dbService.handleRequest(req).subscribe({
        next: () => done.fail('Do not have return in Observable.next in this request'),
        error: (erro: IHttpErrorResponse) => {
          // then
          expect(erro.status).toEqual(STATUS.BAD_REQUEST);
          expect(erro.error).toEqual('Id strategy is set as `provided` and id not provided.');
          done();
        }
      });
    });

  });

  describe('Testes para ID incremental em memória', () => {
    let dbService: MemoryDbService;
    const backendConfig = new BackendConfig({
      returnItemIn201: true,
      delay: 0
    })

    beforeAll((done: DoneFn) => {
      dbService = new MemoryDbService(backendConfig);
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
      dbService.deleteDatabase().then(
        () => done(),
        (error) => done.fail(error)
      );
    })

    it(`Deve criar um item com ID numérico para uma coleação vazia`, (done: DoneFn) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http:://localhost/${collectionCustomers}`,
        body: {
          name: 'Cliente sem ID informado'
        }
      };
      void dbService.clearData(collectionCustomers);
      // when
      dbService.handleRequest(req).subscribe({
        // then
        next: (response: IHttpResponse<ICustomer>) => {
          expect(response.body).toEqual({ id: 1, name: 'Cliente sem ID informado' });
          done();
        },
        error: (erro) => done.fail(erro)
      });
    });

    it(`Deve retornar erro ao tentar criar um item com ID numérico, sem saber como incrementar`, (done: DoneFn) => {
      void (async (): Promise<void> => {
        await dbService.clearData(collectionCustomers);
        await dbService.storeData(collectionCustomers, { id: '123ABC', name: 'Cliente com ID alphanumérico' });
      })().then(() => {
        // given
        const req: IRequestCore<Partial<ICustomer>> = {
          method: 'POST',
          url: `http:://localhost/${collectionCustomers}`,
          body: {
            name: 'Cliente sem ID informado'
          }
        };
        // when
        dbService.handleRequest(req).subscribe({
          next: () => done.fail('Do not have return in Observable.next in this request'),
          error: (erro: IHttpErrorResponse) => {
            // then
            const message = `Collection ${collectionCustomers} id type is non-numeric or unknown. Can only generate numeric ids.`;
            expect(erro.status).toEqual(STATUS.BAD_REQUEST);
            expect(erro.error).toEqual(message);
            done();
          }
        });
      });
    });

  });

});

