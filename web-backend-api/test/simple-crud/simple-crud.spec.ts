import { BackendConfigArgs, dataService, getBackendService, IBackendService, IHttpResponse, setupBackend } from '../../src/public-api';
import { collectionCustomers, customers, ICustomer } from './simple-crud.mock';

describe('Testes para um aplicação CRUD pura e simples em ARRAY de memória', () => {
  let dbService: IBackendService;

  beforeAll((done: DoneFn) => {

    dataService(collectionCustomers, () => null);

    const config: BackendConfigArgs = {
      post204: false, // return the item in body after POST
      put204: false, // return the item in body after PUT
      delete404: false,
      pageEncapsulation: false,
    };
    setupBackend(config, { dbtype: 'memory' }).then(() => {
      dbService = getBackendService();
      dbService.backendUtils({
        createResponseOptions: (url, status, body) => ({ url, status, body }),
        createErrorResponseOptions: (url, status, error) => ({ url, status, error }),
        createPassThruBackend: () => ({ handle: () => { throw new Error('Method not implemented.'); } })
      });
      done();
    }).catch(err => done.fail(err));

  });

  it('Deve buscar todos os clientes sem aplicar filtro', (done: DoneFn) => {
    void (async (): Promise<void> => {
      await dbService.clearData(collectionCustomers);
      for (const customer of customers) {
        await dbService.storeData(collectionCustomers, customer);
      }
    })().then(() => {
      dbService.get$(collectionCustomers, undefined, undefined, collectionCustomers).subscribe(
        (response: IHttpResponse<ICustomer[]>) => {
          expect(response.body).toEqual(customers);
          done();
        },
        error => done.fail(error)
      );
    });
  });

  it('Deve buscar todos os clientes aplicando filtro', (done: DoneFn) => {
    void (async (): Promise<void> => {
      await dbService.clearData(collectionCustomers);
      for (const customer of customers) {
        await dbService.storeData(collectionCustomers, customer);
      }
    })().then(() => {
      const expectedCustomers = customers.filter(customer => customer.name.includes('23451'));
      const query = new Map<string, string[]>([['name', ['23451']]]);
      dbService.get$(collectionCustomers, undefined, query, collectionCustomers).subscribe(
        (response: IHttpResponse<ICustomer[]>) => {
          expect(response.body).toEqual(expectedCustomers);
          done();
        },
        error => done.fail(error)
      );
    });
  });

  it('Deve buscar um cliente pelo id', (done: DoneFn) => {
    void (async (): Promise<void> => {
      await dbService.clearData(collectionCustomers);
      for (const customer of customers) {
        await dbService.storeData(collectionCustomers, customer);
      }
    })().then(() => {
      const expectedCustomer = customers.find(customer => customer.id === 5);
      dbService.get$(collectionCustomers, '5', undefined, collectionCustomers).subscribe(
        (response: IHttpResponse<ICustomer>) => {
          expect(response.body).toEqual(expectedCustomer);
          done();
        },
        error => done.fail(error)
      );
    });
  });

  it('Deve inserir um novo cliente informando o id', (done: DoneFn) => {
    const expectedCustomer: ICustomer = {
      id: 1000,
      name: 'Cliente inserido no teste',
      active: true,
    };
    dbService.post$(collectionCustomers, '1000', expectedCustomer, collectionCustomers).subscribe(
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

  it('Deve inserir um novo cliente sem informar o id', (done: DoneFn) => {
    let expectedCustomer: ICustomer = {
      name: 'Cliente inserido no teste',
      active: true,
    };
    dbService.post$(collectionCustomers, undefined, expectedCustomer, collectionCustomers).subscribe(
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

  it('Deve atualizar a informações de um cliente', (done: DoneFn) => {
    void (async (): Promise<void> => {
      await dbService.clearData(collectionCustomers);
      for (const customer of customers) {
        await dbService.storeData(collectionCustomers, customer);
      }
    })().then(() => {
      dbService.put$(collectionCustomers, '1', { name: 'Alterado nome cliente 1' }, collectionCustomers).subscribe(
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

  it('Deve excluir um cliente pelo id', (done: DoneFn) => {
    void (async (): Promise<void> => {
      await dbService.clearData(collectionCustomers);
      for (const customer of customers) {
        await dbService.storeData(collectionCustomers, customer);
      }
    })().then(() => {
      dbService.delete$(collectionCustomers, '5', collectionCustomers).subscribe(
        (responseDelete: IHttpResponse<ICustomer>) => {
          expect(responseDelete).toEqual(jasmine.objectContaining({ url: 'customers', status: 204 }));
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
