import { dataService, IBackendService } from 'web-backend-api/src';
import { collectionName, customers } from './customers.mock';

dataService(collectionName, (dbService: IBackendService) => {

  customers.forEach((customer) => {
    dbService.storeData(collectionName, customer);
  });
});
