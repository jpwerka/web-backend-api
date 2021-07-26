import { TestCase } from 'jasmine-data-provider-ts';
import { BackendConfigArgs, BackendTypeArgs, dataService, getBackendService, IBackendService, IndexedDbService, IQueryFilter, setupBackend } from '../../src/public-api';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { collectionCustomers, customers, ICustomer } from './get-instance.mock';

describe('Testes para busca diretamente de instâncias', () => {

  TestCase<BackendTypeArgs>([{ dbtype: 'memory' }, { dbtype: 'indexdb' }], (dbType) => {
    let dbService: IBackendService;

    beforeAll((done: DoneFn) => {

      dataService(collectionCustomers, () => null);

      const config: BackendConfigArgs = {
        delay: 0
      };
      setupBackend(config, dbType).then(() => {
        dbService = getBackendService();
        configureBackendUtils(dbService);
        void (async (): Promise<void> => {
          await dbService.clearData(collectionCustomers);
          for (const customer of customers) {
            await dbService.storeData(collectionCustomers, customer);
          }
        })().then(() => done());
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

    it(`Deve buscar uma instancia de um cliente por id. DbType: ${dbType.dbtype}`, (done: DoneFn) => {

      const customer = customers[0];
      dbService.getInstance$(collectionCustomers, 1).subscribe(
        (instance: ICustomer) => {
          expect(instance).toEqual(customer);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve lançar erro ao tentar buscar uma instancia sem informar o ID. DbType: ${dbType.dbtype}`, (done: DoneFn) => {

      dbService.getInstance$(collectionCustomers, null).subscribe({
        next: () => done.fail('Do not have return in Observable.next in this getInstance$'),
        error: erro => {
          expect(erro).toEqual('Não foi passado o id');
          done();
        }
      });
    });

    it(`Deve buscar todas as instâncias de clientes. DbType: ${dbType.dbtype}`, (done: DoneFn) => {

      dbService.getAllByFilter$(collectionCustomers, undefined).subscribe(
        (instances: ICustomer[]) => {
          expect(instances).toEqual(customers);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve buscar todas as instâncias de clientes aplicando os filtros. DbType: ${dbType.dbtype}`, (done: DoneFn) => {

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

    it(`Deve buscar todas as instâncias de clientes aplicando os filtros com OR. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
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
