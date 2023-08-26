/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { TestCase } from 'jasmine-data-provider-ts';
import { BackendConfigArgs, BackendTypeArgs, dataService, getBackendService, IBackendService, IHttpResponse, IndexedDbService, IRequestCore, setupBackend } from '../../public-api';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { collectionCustomers, customers, ICustomer } from './simple-crud.mock';

describe('Testes para uma aplicação CRUD pura e simples', () => {

  TestCase<BackendTypeArgs>([{ dbtype: 'memory' }, { dbtype: 'indexdb' }], (dbType) => {

    let dbService: IBackendService

    beforeAll((done: DoneFn) => {

      dataService(collectionCustomers, () => null);

      const config: BackendConfigArgs = {
        apiBase: '/',
        returnItemIn201: true, // return the item in body after POST
        put204: false, // return the item in body after PUT
        delete404: false,
        pageEncapsulation: false,
        delay: 0
      };

      setupBackend(config, dbType).then(() => {
        dbService = getBackendService();
        configureBackendUtils(dbService);
        done();
      }).catch(err => done.fail(err));

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

    it(`Deve buscar todos os clientes sem aplicar filtro. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
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
        dbService.handleRequest(req).subscribe(
          (response: IHttpResponse<ICustomer[]>) => {
            expect(response.body).toEqual(customers);
            done();
          },
          error => done.fail(error)
        );
      });
    });

    it(`Deve buscar todos os clientes aplicando filtro. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
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
        dbService.handleRequest(req).subscribe(
          (response: IHttpResponse<ICustomer[]>) => {
            expect(response.body).toEqual(expectedCustomers);
            done();
          },
          error => done.fail(error)
        );
      });
    });

    it(`Deve buscar um cliente pelo id. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
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
        dbService.handleRequest(req).subscribe(
          (response: IHttpResponse<ICustomer>) => {
            expect(response.body).toEqual(expectedCustomer);
            done();
          },
          error => done.fail(error)
        );
      });
    });

    it(`Deve inserir um novo cliente informando o id. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
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
      dbService.handleRequest(req).subscribe(
        (responsePost: IHttpResponse<ICustomer>) => {
          expect(responsePost.body).toEqual(expectedCustomer);
          dbService.get$(collectionCustomers, '1000', undefined, collectionCustomers).subscribe(
            (responseGet: IHttpResponse<ICustomer>) => {
              expect(responseGet.body).toEqual(expectedCustomer);
              done();
            },
            error => done.fail(error)
          );
        },
        error => done.fail(error)
      );
    });

    it(`Deve inserir um novo cliente sem informar o id. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      let expectedCustomer: ICustomer = {
        name: 'Cliente inserido no teste',
        active: true,
      };
      const req: IRequestCore<ICustomer> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}`,
        body: expectedCustomer
      };
      dbService.handleRequest(req).subscribe(
        (responsePost: IHttpResponse<ICustomer>) => {
          expect(responsePost.body).toEqual(jasmine.objectContaining(expectedCustomer));
          expectedCustomer = Object.assign(expectedCustomer, { id: responsePost.body.id });
          dbService.get$(collectionCustomers, responsePost.body.id.toString(), undefined, collectionCustomers).subscribe(
            (responseGet: IHttpResponse<ICustomer>) => {
              expect(responseGet.body).toEqual(expectedCustomer);
              done();
            },
            error => done.fail(error)
          );
        },
        error => done.fail(error)
      );
    });

    it(`Deve atualizar a informações de um cliente. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
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
        dbService.handleRequest(req).subscribe(
          (responsePost: IHttpResponse<ICustomer>) => {
            expect(responsePost.body).toEqual(jasmine.objectContaining({ name: 'Alterado nome cliente 1' }));
            const expectedCustomer = Object.assign({}, customers[0], { name: 'Alterado nome cliente 1' });
            dbService.get$(collectionCustomers, '1', undefined, collectionCustomers).subscribe(
              (responseGet: IHttpResponse<ICustomer>) => {
                expect(responseGet.body).toEqual(expectedCustomer);
                done();
              },
              error => done.fail(error)
            );
          },
          error => done.fail(error)
        );
      });
    });

    it(`Deve excluir um cliente pelo id. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
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
        dbService.handleRequest(req).subscribe(
          (responseDelete: IHttpResponse<ICustomer>) => {
            expect(responseDelete).toEqual(jasmine.objectContaining({ url: `http://localhost/${collectionCustomers}/5`, status: 204 }));
            dbService.get$(collectionCustomers, '5', undefined, collectionCustomers).subscribe(
              (responseGet: IHttpResponse<ICustomer>) => done.fail(`Should not return a customer with id ${responseGet.body.id}`),
              error => {
                expect(error).toEqual({ url: 'customers', status: 404, error: 'Request id does not match item with id: 5' });
                done();
              }
            );
          },
          error => done.fail(error)
        );
      });
    });
  });
});
