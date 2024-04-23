/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { IndexedDbService, MemoryDbService } from '../../src/data-service';
import { BackendConfig } from '../../src/data-service/backend-config';
import { IBackendService, IErrorMessage, IHttpErrorResponse, IRequestCore, LoadFn } from '../../src/interfaces';
import { STATUS } from '../../src/utils';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { collectionCustomers, customers, ICustomer } from './simple-crud.mock';

const dataServiceFn = new Map<string, LoadFn[]>();

dataServiceFn.set(collectionCustomers, [(dbService: IBackendService) => {

  for (const customer of customers) {
    void dbService.storeData(collectionCustomers, customer).then(() => null);
  }
}]);

describe('Testes de falha de uma aplicação CRUD com excptions nas funções de transformer', () => {

  [{ dbtype: 'memory' }, { dbtype: 'indexdb' }].forEach((dbType) => {
    let dbService: MemoryDbService | IndexedDbService;
    const backendConfig = new BackendConfig({
      apiBase: '/',
      appendExistingPost: false,
      appendPut: false,
      returnItemIn201: true,
      put204: false,
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

    beforeEach(() => {
      dbService.clearTransformGetBothMap(collectionCustomers);
      dbService.clearTransformPostMap(collectionCustomers);
      dbService.clearTransformPutMap(collectionCustomers);
    })

    it(`Deve retornar erro ao fazer GET By ID e ser lançado exception no TransformGetById. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const req: IRequestCore<null> = {
        method: 'GET',
        url: `http://localhost/${collectionCustomers}/1`,
      };
      const responseError = {
        message: 'Erro no TransformGetById'
      } as IErrorMessage;
      dbService.addTransformGetByIdMap(collectionCustomers, () => {
        throw 'Erro no TransformGetById';
      });
      // when
      dbService.handleRequest(req).then(
        () => done('Do not have return in Promise.thenin this request'),
        (erro: IHttpErrorResponse) => {
          expect(erro.status).toEqual(STATUS.INTERNAL_SERVER_ERROR);
          expect(erro.error).toEqual(responseError);
          done();
        }
      );
    });

    it(`Deve retornar erro ao fazer GET All e ser lançado exception no TransformGetAll. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const req: IRequestCore<null> = {
        method: 'GET',
        url: `http://localhost/${collectionCustomers}`,
      };
      const responseError = {
        message: 'Erro no TransformGetAll',
        detailedMessage: new Error('Erro no TransformGetAll'),
      } as IErrorMessage;
      dbService.addTransformGetAllMap(collectionCustomers, () => {
        throw new Error('Erro no TransformGetAll');
      });
      // when
      dbService.handleRequest(req).then(
        () => done('Do not have return in Promise.thenin this request'),
        (erro: IHttpErrorResponse) => {
          expect(erro.status).toEqual(STATUS.INTERNAL_SERVER_ERROR);
          expect(erro.error).toEqual(responseError);
          done();
        }
      );
    });

    it(`Deve retornar erro ao fazer POST e ser lançado exception no TransformPost. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}`,
        body: {
          name: 'Criando cliente com erro na transformação do POST'
        }
      };
      const responseError = {
        message: 'Erro no TransformPost',
        detailedMessage: 'Esta é uma mensagem de detalhe mais longa'
      } as IErrorMessage;
      dbService.addTransformPostMap(collectionCustomers, () => {
        throw responseError;
      });
      // when
      dbService.handleRequest(req).then(
        () => done('Do not have return in Promise.thenin this request'),
        (erro: IHttpErrorResponse) => {
          expect(erro.status).toEqual(STATUS.INTERNAL_SERVER_ERROR);
          expect(erro.error).toEqual(responseError);
          done();
        }
      );
    });

    it(`Deve retornar erro ao fazer PUT e ser lançado exception no TransformPut. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'PUT',
        url: `http://localhost/${collectionCustomers}/1`,
        body: {
          name: 'Alterando cliente com erro na transformação do PUT'
        }
      };
      const responseError = {
        message: 'Ocorreu um erro desconhecido ao executar o comando',
        detailedMessage: {
          errorMessage: 'Error message desnormalizada',
          errorDetailedMessage: 'Error detailed message desnormalizada',
        }
      } as IErrorMessage;
      dbService.addTransformPutMap(collectionCustomers, () => {
        throw {
          errorMessage: 'Error message desnormalizada',
          errorDetailedMessage: 'Error detailed message desnormalizada',
        };
      });
      // when
      dbService.handleRequest(req).then(
        () => done('Do not have return in Promise.thenin this request'),
        (erro: IHttpErrorResponse) => {
          expect(erro.status).toEqual(STATUS.INTERNAL_SERVER_ERROR);
          expect(erro.error).toEqual(responseError);
          done();
        }
      );
    });

    it(`Deve retornar erro ao fazer POST para atualizar um item e ser lançado exception no TransformPut. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}/1`,
        body: {
          name: 'Alterando cliente com erro na transformação do PUT'
        }
      };
      const responseError = {
        message: 'Ocorreu um erro desconhecido ao executar o comando',
        detailedMessage: 123456789
      } as IErrorMessage;
      dbService.addTransformPutMap(collectionCustomers, () => {
        throw 123456789;
      });
      // when
      dbService.handleRequest(req).then(
        () => done('Do not have return in Promise.thenin this request'),
        (erro: IHttpErrorResponse) => {
          expect(erro.status).toEqual(STATUS.INTERNAL_SERVER_ERROR);
          expect(erro.error).toEqual(responseError);
          done();
        }
      );
    });

    it(`Deve retornar erro ao fazer PUT para criar um item e ser lançado exception no TransformPost. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'PUT',
        url: `http://localhost/${collectionCustomers}/80`,
        body: {
          name: 'Alterando cliente com erro na transformação do PUT'
        }
      };
      const responseError = {
        message: 'Erro no TransformPost'
      } as IErrorMessage;
      dbService.addTransformPostMap(collectionCustomers, () => {
        throw 'Erro no TransformPost';
      });
      // when
      dbService.handleRequest(req).then(
        () => done('Do not have return in Promise.thenin this request'),
        (erro: IHttpErrorResponse) => {
          expect(erro.status).toEqual(STATUS.INTERNAL_SERVER_ERROR);
          expect(erro.error).toEqual(responseError);
          done();
        }
      );
    });

    it(`Deve retornar erro ao fazer POST e ser lançado exception no TransformGet. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}`,
        body: {
          name: 'Criando cliente com erro na transformação do GET'
        }
      };
      const responseError = {
        message: 'Erro no TransformGetById'
      } as IErrorMessage;
      dbService.addTransformGetByIdMap(collectionCustomers, () => {
        throw 'Erro no TransformGetById';
      });
      // when
      dbService.handleRequest(req).then(
        () => done('Do not have return in Promise.thenin this request'),
        (erro: IHttpErrorResponse) => {
          expect(erro.status).toEqual(STATUS.INTERNAL_SERVER_ERROR);
          expect(erro.error).toEqual(responseError);
          done();
        }
      );
    });

    it(`Deve retornar erro ao fazer POST atualizando um registro e ser lançado exception no TransformGet. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}/5`,
        body: {
          name: 'Alterando cliente com POST com erro na transformação do GET'
        }
      };
      const responseError = {
        message: 'Erro no TransformGetById'
      } as IErrorMessage;
      dbService.addTransformGetByIdMap(collectionCustomers, () => {
        throw 'Erro no TransformGetById';
      });
      // when
      dbService.handleRequest(req).then(
        () => done('Do not have return in Promise.thenin this request'),
        (erro: IHttpErrorResponse) => {
          expect(erro.status).toEqual(STATUS.INTERNAL_SERVER_ERROR);
          expect(erro.error).toEqual(responseError);
          done();
        }
      );
    });

    it(`Deve retornar erro ao fazer PUT e ser lançado exception no TransformGet. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'PUT',
        url: `http://localhost/${collectionCustomers}/1`,
        body: {
          name: 'Alterando cliente com erro na transformação do GET'
        }
      };
      const responseError = {
        message: 'Erro no TransformGetById'
      } as IErrorMessage;
      dbService.addTransformGetByIdMap(collectionCustomers, () => {
        throw 'Erro no TransformGetById';
      });
      // when
      dbService.handleRequest(req).then(
        () => done('Do not have return in Promise.thenin this request'),
        (erro: IHttpErrorResponse) => {
          expect(erro.status).toEqual(STATUS.INTERNAL_SERVER_ERROR);
          expect(erro.error).toEqual(responseError);
          done();
        }
      );
    });

    it(`Deve retornar erro ao fazer PUT e ser lançado exception no TransformGet. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'PUT',
        url: `http://localhost/${collectionCustomers}/70`,
        body: {
          name: 'Criando cliente com PUT com erro na transformação do GET'
        }
      };
      const responseError = {
        message: 'Erro no TransformGetById'
      } as IErrorMessage;
      dbService.addTransformGetByIdMap(collectionCustomers, () => {
        throw 'Erro no TransformGetById';
      });
      // when
      dbService.handleRequest(req).then(
        () => done('Do not have return in Promise.thenin this request'),
        (erro: IHttpErrorResponse) => {
          expect(erro.status).toEqual(STATUS.INTERNAL_SERVER_ERROR);
          expect(erro.error).toEqual(responseError);
          done();
        }
      );
    });

  });

});

