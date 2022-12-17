/* eslint-disable @typescript-eslint/no-explicit-any */
import { from, Observable, of } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { IOutboundLoad } from 'src/app/entities/outbound-load/outbound-load.interface';
import { dataService, IBackendService, IHttpResponse, IInterceptorUtils, ResponseInterceptorFn } from 'web-backend-api/database';
import { collectionName as collectionDocuments } from '../outbound-documents/outbound-documents.mock';
import { collectionName, outboundLoads, transformPost, transformPut } from './outbound-loads.mock';

dataService(collectionName, (dbService: IBackendService) => {

  // replace for url: http://{host:port}/api/loads/outbound
  // collection url after replace is: http://{host:port}/api/{collectionName}
  dbService.addReplaceUrl(collectionName, 'loads/outbound');

  dbService.addTransformPostMap(collectionName, transformPost);

  dbService.addTransformPutMap(collectionName, transformPut);

  dbService.addJoinGetAllMap(collectionName, {
    fieldId: 'documentsId',
    collectionSource: collectionDocuments,
    transformerGet: true,
    joinFields: true,
  });

  // add interceptor to generate a document identifier
  dbService.addRequestInterceptor({
    method: 'POST',
    path: 'identifier',
    applyToPath: 'beforeId',
    collectionName,
    response: (utils: IInterceptorUtils) => {
      const identifier = Math.floor(Math.random() * (9000000000 - 1000000000)) + 1000000000;
      return utils.fn.response(utils.url, 200, { identifier });
    }
  });

  const responseUnloadedDocuments: ResponseInterceptorFn = (utils: IInterceptorUtils) => {
    const query = new Map<string, any[]>();
    query.set('isLoaded', [false]);
    return dbService.get$(collectionDocuments, undefined, query, utils.url);
  };

  dbService.addRequestInterceptor({
    method: 'GET',
    path: 'documents',
    applyToPath: 'beforeId',
    collectionName,
    response: responseUnloadedDocuments,
  });

  const responseDocuments: ResponseInterceptorFn = (utils: IInterceptorUtils) => {
    return from(dbService.getInstance$(collectionName, utils.id)).pipe(
      mergeMap((load: IOutboundLoad) => {
        const query = new Map<string, any[]>();
        query.set('id', load.documentsId);
        return dbService.get$(collectionDocuments, undefined, query, utils.url);
      })
    );
  };

  dbService.addRequestInterceptor({
    method: 'GET',
    path: 'documents',
    applyToPath: 'afterId',
    collectionName,
    response: responseDocuments,
  });

  const responseCreateOutboundLoad: ResponseInterceptorFn = (utils: IInterceptorUtils) => {
    return dbService.post$(collectionName, undefined, utils.body, utils.url).pipe(
      concatMap((response: IHttpResponse<IOutboundLoad>) => {
        return new Observable(observer => {
          const outboundLoad = response.body;
          from(outboundLoad.documentsId).pipe(
            mergeMap(documentId => dbService.put$(collectionDocuments, documentId.toString(), { isLoaded: true }, utils.url))
          ).subscribe(
            () => null,
            (error) => observer.error(error),
            () => {
              observer.next(response);
              observer.complete();
            }
          );
        });
      })
    );
  };

  dbService.addRequestInterceptor({
    method: 'POST',
    path: '',
    applyToPath: 'beforeId',
    collectionName,
    response: responseCreateOutboundLoad,
  });

  const responseAddDocument: ResponseInterceptorFn = (utils: IInterceptorUtils & { body: { documentId: number } }) => {
    return from(dbService.getInstance$(collectionName, utils.id)).pipe(
      concatMap((outboundLoad: IOutboundLoad) => {
        outboundLoad.documentsId.push(utils.body.documentId);
        return dbService.post$(collectionName, utils.id, outboundLoad, utils.url).pipe(
          concatMap(response =>
            dbService.put$(collectionDocuments, utils.body.documentId.toString(), { isLoaded: true }, utils.url).pipe(
              concatMap(() => of(response))
            )
          )
        );
      })
    );
  };

  dbService.addRequestInterceptor({
    method: 'POST',
    path: 'documents/add',
    applyToPath: 'afterId',
    collectionName,
    response: responseAddDocument,
  });

  const responseRemoveDocument: ResponseInterceptorFn = (utils: IInterceptorUtils & { body: { documentId: number } }) => {
    return from(dbService.getInstance$(collectionName, utils.id)).pipe(
      concatMap((outboundLoad: IOutboundLoad) => {
        // tslint:disable-next-line: triple-equals
        const index = outboundLoad.documentsId.findIndex(item => item == utils.body.documentId);
        if (index >= 0) {
          outboundLoad.documentsId.splice(index, 1);
        }
        return dbService.post$(collectionName, utils.id, outboundLoad, utils.url).pipe(
          concatMap(response =>
            dbService.put$(collectionDocuments, utils.body.documentId.toString(), { isLoaded: false }, utils.url).pipe(
              concatMap(() => of(response))
            )
          )
        );
      })
    );
  };

  dbService.addRequestInterceptor({
    method: 'POST',
    path: 'documents/remove',
    applyToPath: 'afterId',
    collectionName,
    response: responseRemoveDocument,
  });

  const responseDeleteOutboundLoad: ResponseInterceptorFn = (utils: IInterceptorUtils) => {
    return new Observable(observer => {
      from(dbService.getInstance$(collectionName, utils.id)).subscribe((outboundLoad: IOutboundLoad) => {
        dbService.delete$(collectionName, utils.id, utils.url).subscribe(response => {
          from(outboundLoad.documentsId).pipe(
            mergeMap(documentId => dbService.put$(collectionDocuments, documentId.toString(), { isLoaded: false }, utils.url))
          ).subscribe(
            () => null,
            (error) => observer.error(error),
            () => {
              observer.next(response);
              observer.complete();
            }
          );
        }, (error) => observer.error(error));
      }, (error) => observer.error(error));
    });
  };


  dbService.addRequestInterceptor({
    method: 'DELETE',
    path: '',
    applyToPath: 'afterId',
    collectionName,
    response: responseDeleteOutboundLoad,
  });

  outboundLoads.forEach((outboundLoad) => {
    void dbService.storeData(collectionName, outboundLoad).then(() => null);
  });
});
