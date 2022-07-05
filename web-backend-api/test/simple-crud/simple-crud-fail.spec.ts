import { TestCase } from 'jasmine-data-provider-ts';
import { BackendConfig } from '../../database/src/data-service/backend-config';
import { BackendTypeArgs, IBackendService, IHttpErrorResponse, IndexedDbService, IRequestCore, LoadFn, MemoryDbService, STATUS } from '../../public-api';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { collectionCustomers, customers, ICustomer } from './simple-crud.mock';

const dataServiceFn = new Map<string, LoadFn[]>();

dataServiceFn.set(collectionCustomers, [(dbService: IBackendService) => {

  for (const customer of customers) {
    void dbService.storeData(collectionCustomers, customer).then(() => null);
  }
}]);

describe('Testes de falha de uma aplicação CRUD simples', () => {

  TestCase<BackendTypeArgs>([{ dbtype: 'memory' }, { dbtype: 'indexdb' }], (dbType) => {
    let dbService: MemoryDbService | IndexedDbService;
    const backendConfig = new BackendConfig({
      post409: true,
      put404: true,
      delete404: true,
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

    it(`Deve retornar NOT_FOUND ao fazer a busca por um id inexistente. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const req: IRequestCore<null> = {
        method: 'GET',
        url: `http:://localhost/${collectionCustomers}/99`,
      };
      // when
      dbService.handleRequest(req).subscribe({
        next: () => done.fail('Do not have return in Observable.next in this request'),
        error: (erro: IHttpErrorResponse) => {
          // then
          expect(erro.status).toEqual(STATUS.NOT_FOUND);
          expect(erro.error).toEqual(`Request id does not match item with id: ${99}`);
          done();
        }
      });
    });

    it(`Deve retornar BAD_REQUEST ao tentar fazer POST com ID diferente do body. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http:://localhost/${collectionCustomers}/98`,
        body: {
          id: 99,
          name: 'Novo cliente 99',
        }
      };
      // when
      dbService.handleRequest(req).subscribe({
        next: () => done.fail('Do not have return in Observable.next in this request'),
        error: (erro: IHttpErrorResponse) => {
          // then
          expect(erro.status).toEqual(STATUS.BAD_REQUEST);
          expect(erro.error).toEqual(`Request id (${98}) does not match item.id (${99})`);
          done();
        }
      });
    });

    it(`Deve retornar CONFLICT ao tentar fazer POST para atualizar item existente. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http:://localhost/${collectionCustomers}/1`,
        body: {
          name: 'Aterando cliente 01',
        }
      };
      const responseError = {
        message: `'${collectionCustomers}' item with id='${1}' exists and may not be updated with POST.`,
        detailedMessage: 'Use PUT instead.'
      };
      // when
      dbService.handleRequest(req).subscribe({
        next: () => done.fail('Do not have return in Observable.next in this request'),
        error: (erro: IHttpErrorResponse) => {
          // then
          expect(erro.status).toEqual(STATUS.CONFLICT);
          expect(erro.error).toEqual(responseError);
          done();
        }
      });
    });

    it(`Deve retornar BAD_REQUEST ao tentar fazer PUT sem informar o ID. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'PUT',
        url: `http:://localhost/${collectionCustomers}`,
        body: {
          name: 'Aterando cliente 01',
        }
      };
      // when
      dbService.handleRequest(req).subscribe({
        next: () => done.fail('Do not have return in Observable.next in this request'),
        error: (erro: IHttpErrorResponse) => {
          expect(erro.status).toEqual(STATUS.BAD_REQUEST);
          expect(erro.error).toEqual(`Missing ${collectionCustomers} id`);
          done();
        }
      });
    });

    it(`Deve retornar BAD_REQUEST ao tentar fazer PUT com ID diferente do body. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'PUT',
        url: `http:://localhost/${collectionCustomers}/99`,
        body: {
          id: 98,
          name: 'Aterando cliente 01',
        }
      };
      const responseError = {
        message: `Request for ${collectionCustomers} id (${99}) does not match item.id (${98})`,
        detailedMessage: `Don't provide item.id in body or provide same id in both (url, body).`
      };
      // when
      dbService.handleRequest(req).subscribe({
        next: () => done.fail('Do not have return in Observable.next in this request'),
        error: (erro: IHttpErrorResponse) => {
          expect(erro.status).toEqual(STATUS.BAD_REQUEST);
          expect(erro.error).toEqual(responseError);
          done();
        }
      });
    });

    it(`Deve retornar NOT_FOUND ao tentar fazer PUT para ID inexistente. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'PUT',
        url: `http:://localhost/${collectionCustomers}/90`,
        body: {
          id: 90,
          name: 'Aterando cliente 90',
        }
      };
      const responseError = {
        message: `${collectionCustomers} item with id (${90}) not found and may not be created with PUT.`,
        detailedMessage: 'Use POST instead.'
      };
      // when
      dbService.handleRequest(req).subscribe({
        next: () => done.fail('Do not have return in Observable.next in this request'),
        error: (erro: IHttpErrorResponse) => {
          expect(erro.status).toEqual(STATUS.NOT_FOUND);
          expect(erro.error).toEqual(responseError);
          done();
        }
      });
    });

    it(`Deve retornar BAD_REQUEST ao tentar fazer DELETE sem informar o ID. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const req: IRequestCore<null> = {
        method: 'DELETE',
        url: `http:://localhost/${collectionCustomers}`,
      };
      // when
      dbService.handleRequest(req).subscribe({
        next: () => done.fail('Do not have return in Observable.next in this request'),
        error: (erro: IHttpErrorResponse) => {
          expect(erro.status).toEqual(STATUS.BAD_REQUEST);
          expect(erro.error).toEqual(`Missing ${collectionCustomers} id`);
          done();
        }
      });
    });

    it(`Deve retornar NOT_FOUND ao tentar fazer DELETE para ID inexistente. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const req: IRequestCore<null> = {
        method: 'DELETE',
        url: `http:://localhost/${collectionCustomers}/90`,
      };
      const responseError = {
        message: `Error to find ${collectionCustomers} with id (${90})`,
        detailedMessage: 'Id não encontrado.'
      };
      // when
      dbService.handleRequest(req).subscribe({
        next: () => done.fail('Do not have return in Observable.next in this request'),
        error: (erro: IHttpErrorResponse) => {
          expect(erro.status).toEqual(STATUS.NOT_FOUND);
          expect(erro.error).toEqual(responseError);
          done();
        }
      });
    });

  });

});

