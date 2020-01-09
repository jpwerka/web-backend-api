import { dataService, IBackendService } from 'web-backend-api/src';
import { collectionName, products } from './products.mock';

dataService(collectionName, (dbService: IBackendService) => {

  products.forEach((product) => {
    dbService.storeData(collectionName, product);
  });
});
