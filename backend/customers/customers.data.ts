import { dataService, IBackendService, ResponseInterceptorFn, IInterceptorUtils } from 'web-backend-api/src';
import { collectionName, customers } from './customers.mock';

dataService(collectionName, (dbService: IBackendService) => {

  const responseActive: ResponseInterceptorFn = (utils: IInterceptorUtils): any => {
    return dbService.put$(collectionName, utils.id, { id: utils.id, active: true }, utils.url);
  };

  const responseInactive: ResponseInterceptorFn = (utils: IInterceptorUtils): any => {
    return dbService.put$(collectionName, utils.id, { id: utils.id, active: false }, utils.url);
  };

  dbService.addRequestInterceptor({
    method: 'POST',
    path: 'active',
    collectionName,
    applyToPath: 'afterId',
    response: responseActive
  });

  dbService.addRequestInterceptor({
    method: 'POST',
    path: 'inactive',
    collectionName,
    applyToPath: 'afterId',
    response: responseInactive
  });

  customers.forEach((customer) => {
    dbService.storeData(collectionName, customer);
  });
});
