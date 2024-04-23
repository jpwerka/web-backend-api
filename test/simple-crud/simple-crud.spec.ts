/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { IndexedDbService, dataService, getBackendService, setupBackend } from '../../src/data-service';
import { BackendConfigArgs, BackendTypeArgs, IBackendService, IHttpResponse, IRequestCore } from '../../src/interfaces';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { collectionCustomers, customers, ICustomer } from './simple-crud.mock';
import { cloneDeep } from '../../src/utils/deep-clone';

describe('Testes para uma aplicação CRUD pura e simples', () => {

  const cases: BackendTypeArgs[] = [{ dbtype: 'memory' }, { dbtype: 'indexdb' }];

  cases.forEach((dbType) => {

    let dbService: IBackendService

    beforeAll(async () => {

      dataService(collectionCustomers, () => null);

      const config: BackendConfigArgs = {
        apiBase: '/',
        returnItemIn201: true, // return the item in body after POST
        put204: false, // return the item in body after PUT
        delete404: false,
        pageEncapsulation: false,
        delay: 0
      };

      await setupBackend(config, dbType);
      dbService = getBackendService();
      configureBackendUtils(dbService);

    });

    afterAll(async () => {
      if (dbService instanceof IndexedDbService) {
        dbService.closeDatabase();
      }
      await dbService.deleteDatabase();
    })

    it(`Deve buscar todos os clientes sem aplicar filtro. DbType: ${dbType.dbtype}`, (done) => {
      void (async (): Promise<void> => {
        await dbService.clearData(collectionCustomers);
        for (const customer of customers) {
          await dbService.storeData(collectionCustomers, customer);
        }
      })().then(() => {
        const req: IRequestCore<null> = {
          method: 'GET',
          url: `http://localhost/${collectionCustomers}`
        };
        dbService.handleRequest<ICustomer[]>(req).then(
          (response: IHttpResponse<ICustomer[]>) => {
            expect(response.body).toEqual(customers);
            done();
          },
          error => done(error)
        );
      });
    });

    it(`Deve buscar todos os clientes aplicando filtro. DbType: ${dbType.dbtype}`, (done) => {
      void (async (): Promise<void> => {
        await dbService.clearData(collectionCustomers);
        for (const customer of customers) {
          await dbService.storeData(collectionCustomers, customer);
        }
      })().then(() => {
        const expectedCustomers = customers.filter(customer => customer.name.includes('23451'));
        const req: IRequestCore<null> = {
          method: 'GET',
          url: `http://localhost/${collectionCustomers}`,
          urlWithParams: `http://localhost/${collectionCustomers}?name=23451`
        };
        dbService.handleRequest<ICustomer[]>(req).then(
          (response: IHttpResponse<ICustomer[]>) => {
            expect(response.body).toEqual(expectedCustomers);
            done();
          },
          error => done(error)
        );
      });
    });

    it(`Deve buscar um cliente pelo id. DbType: ${dbType.dbtype}`, (done) => {
      void (async (): Promise<void> => {
        await dbService.clearData(collectionCustomers);
        for (const customer of customers) {
          await dbService.storeData(collectionCustomers, customer);
        }
      })().then(() => {
        const expectedCustomer = customers.find(customer => customer.id === 5);
        const req: IRequestCore<null> = {
          method: 'GET',
          url: `http://localhost/${collectionCustomers}/5`,
        };
        dbService.handleRequest<ICustomer>(req).then(
          (response: IHttpResponse<ICustomer>) => {
            expect(response.body).toEqual(expectedCustomer);
            done();
          },
          error => done(error)
        );
      });
    });

    it(`Deve inserir um novo cliente informando o id. DbType: ${dbType.dbtype}`, (done) => {
      const expectedCustomer: ICustomer = {
        id: 1000,
        name: 'Cliente inserido no teste',
        active: true,
      };
      const req: IRequestCore<ICustomer> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}`,
        body: expectedCustomer
      };
      dbService.handleRequest<ICustomer>(req).then(
        (responsePost: IHttpResponse<ICustomer>) => {
          expect(responsePost.body).toEqual(expectedCustomer);
          dbService.get$<ICustomer>(collectionCustomers, '1000', undefined, collectionCustomers).then(
            (responseGet: IHttpResponse<ICustomer>) => {
              expect(responseGet.body).toEqual(expectedCustomer);
              done();
            },
            error => done(error)
          );
        },
        error => done(error)
      );
    });

    it(`Deve inserir um novo cliente sem informar o id. DbType: ${dbType.dbtype}`, (done) => {
      let expectedCustomer: ICustomer = {
        name: 'Cliente inserido no teste',
        active: true,
      };
      const req: IRequestCore<ICustomer> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}`,
        body: cloneDeep(expectedCustomer)
      };
      dbService.handleRequest<ICustomer>(req).then(
        (responsePost: IHttpResponse<ICustomer>) => {
          const { name, active } = responsePost.body;
          expect({ name, active }).toEqual(expectedCustomer);
          expectedCustomer = Object.assign(expectedCustomer, { id: responsePost.body.id });
          dbService.get$<ICustomer>(collectionCustomers, responsePost.body.id.toString(), undefined, collectionCustomers).then(
            (responseGet: IHttpResponse<ICustomer>) => {
              expect(responseGet.body).toEqual(expectedCustomer);
              done();
            },
            error => done(error)
          );
        },
        error => done(error)
      );
    });

    it(`Deve atualizar a informações de um cliente. DbType: ${dbType.dbtype}`, (done) => {
      void (async (): Promise<void> => {
        await dbService.clearData(collectionCustomers);
        for (const customer of customers) {
          await dbService.storeData(collectionCustomers, customer);
        }
      })().then(() => {
        const req: IRequestCore<{ name: string }> = {
          method: 'PUT',
          url: `http://localhost/${collectionCustomers}/1`,
          body: { name: 'Alterado nome cliente 1' }
        };
        dbService.handleRequest<ICustomer>(req).then(
          (responsePost: IHttpResponse<ICustomer>) => {
            const { name } = responsePost.body;
            expect({ name }).toEqual({ name: 'Alterado nome cliente 1' });
            const expectedCustomer = Object.assign({}, customers[0], { name: 'Alterado nome cliente 1' });
            dbService.get$(collectionCustomers, '1', undefined, collectionCustomers).then(
              (responseGet: IHttpResponse<ICustomer>) => {
                expect(responseGet.body).toEqual(expectedCustomer);
                done();
              },
              error => done(error)
            );
          },
          error => done(error)
        );
      });
    });

    it(`Deve excluir um cliente pelo id. DbType: ${dbType.dbtype}`, (done) => {
      void (async (): Promise<void> => {
        await dbService.clearData(collectionCustomers);
        for (const customer of customers) {
          await dbService.storeData(collectionCustomers, customer);
        }
      })().then(() => {
        const req: IRequestCore<void> = {
          method: 'DELETE',
          url: `http://localhost/${collectionCustomers}/5`,
        };
        dbService.handleRequest<void>(req).then(
          (responseDelete: IHttpResponse<void>) => {
            const { url, status } = responseDelete;
            expect({ url, status }).toEqual({ url: `http://localhost/${collectionCustomers}/5`, status: 204 });
            dbService.get$<ICustomer>(collectionCustomers, '5', undefined, collectionCustomers).then(
              (responseGet: IHttpResponse<ICustomer>) => done(`Should not return a customer with id ${responseGet.body.id}`),
              error => {
                expect(error).toEqual({ url: 'customers', status: 404, error: 'Request id does not match item with id: 5' });
                done();
              }
            );
          },
          error => done(error)
        );
      });
    });
  });
});
