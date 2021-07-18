import { TestCase } from 'jasmine-data-provider-ts';
import { BackendConfigArgs, BackendTypeArgs, dataService, getBackendService, IBackendService, IndexedDbService, IQueryFilter, setupBackend } from '../../src/public-api';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { collectionCustomers, customers, ICustomer } from './get-instance.mock';

describe('Testes para busca diretamente de instâncias', () => {
  let dbService: IBackendService;

  TestCase<BackendTypeArgs>([{ dbtype: 'memory' }, { dbtype: 'indexdb' }], (dbType) => {

    beforeAll((done: DoneFn) => {

      dataService(collectionCustomers, () => null);

      const config: BackendConfigArgs = {
        post204: false, // return the item in body after POST
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
      if (dbType.dbtype === 'indexdb') {
        (dbService as IndexedDbService).closeDatabase();
      }
      dbService.deleteDatabase().then(
        () => done(),
        (error) => done.fail(error)
      );
    })

    it(`Deve buscar uma instancia de um cliente por id. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      void (async (): Promise<void> => {
        await dbService.clearData(collectionCustomers);
        for (const customer of customers) {
          await dbService.storeData(collectionCustomers, customer);
        }
      })().then(() => {
        const customer = customers[0];
        dbService.getInstance$(collectionCustomers, 1).subscribe(
          (instance: ICustomer) => {
            expect(instance).toEqual(customer);
            done();
          },
          error => done.fail(error)
        );
      });
    });

    it(`Deve buscar todas as instâncias de clientes. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      void (async (): Promise<void> => {
        await dbService.clearData(collectionCustomers);
        for (const customer of customers) {
          await dbService.storeData(collectionCustomers, customer);
        }
      })().then(() => {
        dbService.getAllByFilter$(collectionCustomers, undefined).subscribe(
          (instances: ICustomer[]) => {
            expect(instances).toEqual(customers);
            done();
          },
          error => done.fail(error)
        );
      });
    });

    it(`Deve buscar todas as instâncias de clientes aplicando os filtros. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      void (async (): Promise<void> => {
        await dbService.clearData(collectionCustomers);
        for (const customer of customers) {
          await dbService.storeData(collectionCustomers, customer);
        }
      })().then(() => {
        const expectedCustomers = customers.filter(customer => customer.name.includes('345'));
        const conditions: IQueryFilter[] = [{
          name: 'name',
          rx: new RegExp('345')
        }];
        dbService.getAllByFilter$(collectionCustomers, conditions).subscribe(
          (instances: ICustomer[]) => {
            expect(instances).toEqual(expectedCustomers);
            done();
          },
          error => done.fail(error)
        );
      });
    });

    it(`Deve buscar todas as instâncias de clientes aplicando os filtros com OR. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      void (async (): Promise<void> => {
        await dbService.clearData(collectionCustomers);
        for (const customer of customers) {
          await dbService.storeData(collectionCustomers, customer);
        }
      })().then(() => {
        const expectedCustomers = customers.filter(customer => (customer.name.includes('345') || customer.id === 4));
        const conditions: IQueryFilter[] = [{
          name: 'name',
          rx: new RegExp('345'),
          or: true
        }, {
          name: 'id',
          fn: (item: ICustomer) => item.id === 4,
          or: true
        }];
        dbService.getAllByFilter$(collectionCustomers, conditions).subscribe(
          (instances: ICustomer[]) => {
            expect(instances).toEqual(expectedCustomers);
            done();
          },
          error => done.fail(error)
        );
      });
    });

  });

});
