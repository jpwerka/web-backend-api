/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { TestCase } from 'jasmine-data-provider-ts';
import { BackendTypeArgs, IBackendService, IHttpResponse, IndexedDbService, LoadFn, MemoryDbService } from '../../database/public-api';
import { BackendConfig } from '../../database/src/data-service/backend-config';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { IOutboundDocument, collectionDocuments, documents } from './orders.mock';

const dataServiceFn = new Map<string, LoadFn[]>();
dataServiceFn.set(collectionDocuments, [(dbService: IBackendService) => {

  documents.forEach(document => {
    void dbService.storeData(collectionDocuments, document).then(() => null);
  })
}]);

describe('Testes para cenários de ordenação', () => {

  TestCase<BackendTypeArgs>([{ dbtype: 'memory' }, { dbtype: 'indexdb' }], (dbType) => {
    let dbService: MemoryDbService | IndexedDbService;

    beforeAll((done: DoneFn) => {
      if (dbType.dbtype === 'memory') {
        dbService = new MemoryDbService(new BackendConfig({ pageEncapsulation: false }));
      } else {
        dbService = new IndexedDbService(new BackendConfig({ pageEncapsulation: false }));
      }
      configureBackendUtils(dbService);
      dbService.createDatabase().then(
        () => dbService.createObjectStore(dataServiceFn).then(
          () => done(),
          error => done.fail(error)
        ),
        error => done.fail(error)
      );
    });

    beforeEach(() => {
      dbService.clearFieldCompareMap(collectionDocuments);
    });

    afterAll((done: DoneFn) => {
      if (dbService instanceof IndexedDbService) {
        dbService.closeDatabase();
      }
      dbService.deleteDatabase().then(
        () => done(),
        (error) => done.fail(error)
      );
    });

    const defaultCmp = function (a: unknown, b: unknown): number {
      if (a == b) return 0;
      return a < b ? -1 : 1;
    };

    const reverseCmp = function (a: unknown, b: unknown) {
      return -1 * defaultCmp(a, b);
    };

    it(`Deve fazer uma ordenação básica por um campo do tipo data ASC. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const expectedOrdered = documents.map(doc => doc.createdAt);
      expectedOrdered.sort(defaultCmp);
      const query = new Map<string, string[]>([['order', ['createdAt']]]);

      // when
      dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
        (response: IHttpResponse<IOutboundDocument[]>) => {
          // then
          const expectsCreatedAt = response.body.map(doc => doc.createdAt);
          expect(expectsCreatedAt).toEqual(expectedOrdered);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve fazer uma ordenação básica por um campo do tipo data DESC. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const expectedOrdered = documents.map(doc => doc.createdAt);
      expectedOrdered.sort(reverseCmp);
      const query = new Map<string, string[]>([['order', ['-createdAt']]]);

      // when
      dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
        (response: IHttpResponse<IOutboundDocument[]>) => {
          // then
          const expectsCreatedAt = response.body.map(doc => doc.createdAt);
          expect(expectsCreatedAt).toEqual(expectedOrdered);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve fazer uma ordenação composta por dois campos (customerId ASC, identifier ASC). DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const expectedOrdered = documents.map(doc => ({ customerId: doc.customerId, identifier: doc.identifier }));
      expectedOrdered.sort((a, b) => {
        let result: number;
        result = defaultCmp(a.customerId, b.customerId);
        if (result === 0) {
          result = defaultCmp(a.identifier, b.identifier);
        }
        return result;
      });
      const query = new Map<string, string[]>([['order', ['customerId', 'identifier']]]);

      // when
      dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
        (response: IHttpResponse<IOutboundDocument[]>) => {
          // then
          const expectsCreatedAt = response.body.map(doc => ({ customerId: doc.customerId, identifier: doc.identifier }));
          expect(expectsCreatedAt).toEqual(expectedOrdered);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve fazer uma ordenação composta por dois campos (customerId ASC, identifier DESC). DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const expectedOrdered = documents.map(doc => ({ customerId: doc.customerId, identifier: doc.identifier }));
      expectedOrdered.sort((a, b) => {
        let result: number;
        result = defaultCmp(a.customerId, b.customerId);
        if (result === 0) {
          result = reverseCmp(a.identifier, b.identifier);
        }
        return result;
      });
      const query = new Map<string, string[]>([['order', ['customerId', '-identifier']]]);

      // when
      dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
        (response: IHttpResponse<IOutboundDocument[]>) => {
          // then
          const expectsCreatedAt = response.body.map(doc => ({ customerId: doc.customerId, identifier: doc.identifier }));
          expect(expectsCreatedAt).toEqual(expectedOrdered);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve fazer uma ordenação composta por dois campos (customerId DESC, identifier ASC). DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const expectedOrdered = documents.map(doc => ({ customerId: doc.customerId, identifier: doc.identifier }));
      expectedOrdered.sort((a, b) => {
        let result: number;
        result = reverseCmp(a.customerId, b.customerId);
        if (result === 0) {
          result = defaultCmp(a.identifier, b.identifier);
        }
        return result;
      });
      const query = new Map<string, string[]>([['order', ['-customerId', 'identifier']]]);

      // when
      dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
        (response: IHttpResponse<IOutboundDocument[]>) => {
          // then
          const expectsCreatedAt = response.body.map(doc => ({ customerId: doc.customerId, identifier: doc.identifier }));
          expect(expectsCreatedAt).toEqual(expectedOrdered);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve fazer uma ordenação utilizando uma função customizada ASC. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const compareFn = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
      const expectedOrdered = documents.map(doc => doc.description);
      expectedOrdered.sort(compareFn);
      const query = new Map<string, string[]>([['order', ['description']]]);
      dbService.addFieldCompareMap(collectionDocuments, 'description', compareFn);

      // when
      dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
        (response: IHttpResponse<IOutboundDocument[]>) => {
          // then
          const expectsDescriptions = response.body.map(doc => doc.description);
          expect(expectsDescriptions).toEqual(expectedOrdered);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve fazer uma ordenação utilizando uma função customizada DESC. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const compareFn = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
      const expectedOrdered = documents.map(doc => doc.description);
      expectedOrdered.sort((a, b) => (compareFn(a, b) * -1));
      const query = new Map<string, string[]>([['order', ['-description']]]);
      dbService.addFieldCompareMap(collectionDocuments, 'description', compareFn);

      // when
      dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
        (response: IHttpResponse<IOutboundDocument[]>) => {
          // then
          const expectsDescriptions = response.body.map(doc => doc.description);
          expect(expectsDescriptions).toEqual(expectedOrdered);
          done();
        },
        error => done.fail(error)
      );
    });



  });

});
