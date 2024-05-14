
import { IndexedDbService, dataService, getBackendService, setupBackend } from '../../src/data-service';
import { BackendTypeArgs, IBackendService, IQueryFilter } from '../../src/interfaces';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { ICustomer, collectionCustomers, customers } from './get-instance.mock';

describe('Testes para busca diretamente de instâncias', () => {

  const cases: BackendTypeArgs[] = [{ dbtype: 'memory' }, { dbtype: 'indexdb' }];

  cases.forEach((dbType) => {

    let dbService: IBackendService;

    beforeAll(async () => {

      dataService(collectionCustomers, () => null);

      await setupBackend({ delay: 0 }, dbType);
      dbService = getBackendService();
      configureBackendUtils(dbService);
      await dbService.clearData(collectionCustomers);
      for (const customer of customers) {
        await dbService.storeData(collectionCustomers, customer);
      }
    });

    afterAll(async () => {
      if (dbService instanceof IndexedDbService) {
        dbService.closeDatabase();
      }
      await dbService.deleteDatabase();
    })

    it(`Deve buscar uma instancia de um cliente por id. DbType: ${dbType.dbtype}`, async () => {
      const customer = customers[0];
      const instance: ICustomer = await dbService.getInstance$(collectionCustomers, 1);
      expect(instance).toEqual(customer);
    });

    it(`Deve lançar erro ao tentar buscar uma instancia sem informar o ID. DbType: ${dbType.dbtype}`, async () => {

      try {
        await dbService.getInstance$(collectionCustomers, null);
      } catch (erro) {
        expect(erro).toEqual('Não foi passado o id');
      }
    });

    it(`Deve buscar todas as instâncias de clientes. DbType: ${dbType.dbtype}`, async () => {

      const instances = await dbService.getAllByFilter$<ICustomer>(collectionCustomers, undefined);
      expect(instances).toEqual(customers);
    });

    it(`Deve buscar todas as instâncias de clientes aplicando os filtros. DbType: ${dbType.dbtype}`, async () => {

      const expectedCustomers = customers.filter(customer => customer.name.includes('345'));
      const conditions: IQueryFilter[] = [{
        name: 'name',
        rx: new RegExp('345')
      }];
      const instances = await dbService.getAllByFilter$<ICustomer>(collectionCustomers, conditions);
      expect(instances).toEqual(expectedCustomers);
    });

    it(`Deve buscar todas as instâncias de clientes aplicando os filtros com OR. DbType: ${dbType.dbtype}`, async () => {
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
      const instances = await dbService.getAllByFilter$<ICustomer>(collectionCustomers, conditions);
      expect(instances).toEqual(expectedCustomers);
    });

  });

});
