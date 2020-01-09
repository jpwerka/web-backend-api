import { dataService, IBackendService } from 'web-backend-api/src';
import { collectionName, outboundLoads, transformPost, transformPut } from './outbound-loads.mock';

dataService(collectionName, (dbService: IBackendService) => {

  // replace for url: http://{host:port}/api/loads/outbound
  // collection url after replace is: http://{host:port}/api/{collectionName}
  dbService.addReplaceUrl(collectionName, 'loads/outbound');

  dbService.addTransformPostMap(collectionName, transformPost);

  dbService.addTransformPutMap(collectionName, transformPut);

  outboundLoads.forEach((outboundLoad) => {
    dbService.storeData(collectionName, outboundLoad);
  });
});
