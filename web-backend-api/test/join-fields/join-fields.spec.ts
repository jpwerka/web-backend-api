import { TestCase } from 'jasmine-data-provider-ts';
import { BackendConfig } from '../../src/lib/data-service/backend-config';
import { BackendTypeArgs, IBackendService, IHttpResponse, IndexedDbService, LoadFn, MemoryDbService } from '../../src/public-api';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { collectionCustomers, collectionDocuments, collectionProducts, customers, documents, ICustomer, IOutboundDocument, IProduct, products } from './join-fields.mock';

const dataServiceFn = new Map<string, LoadFn[]>();
dataServiceFn.set(collectionDocuments, [(dbService: IBackendService) => {

  documents.forEach(document => {
    void dbService.storeData(collectionDocuments, document).then(() => null);
  })
}]);

dataServiceFn.set(collectionCustomers, [(dbService: IBackendService) => {

  customers.forEach(customer => {
    void dbService.storeData(collectionCustomers, customer).then(() => null);
  });
}]);

dataServiceFn.set(collectionProducts, [(dbService: IBackendService) => {

  products.forEach(product => {
    void dbService.storeData(collectionProducts, product).then(() => null);
  });
}]);

describe('Testes para JOIN de várias coleções', () => {
  let dbService: MemoryDbService | IndexedDbService;

  TestCase<BackendTypeArgs>([{ dbtype: 'memory' }, { dbtype: 'indexdb' }], (dbType) => {

    beforeAll((done: DoneFn) => {
      if (dbType.dbtype === 'memory') {
        dbService = new MemoryDbService(new BackendConfig({ pageEncapsulation: false, strategyId: 'uuid' }));
      } else {
        dbService = new IndexedDbService(new BackendConfig({ pageEncapsulation: false, strategyId: 'uuid' }));
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
      dbService.clearJoinGetBothMap(collectionDocuments);
      dbService.clearFieldFilterMap(collectionDocuments);
    });

    afterAll((done: DoneFn) => {
      if (dbType.dbtype === 'indexdb') {
        (dbService as IndexedDbService).closeDatabase();
      }
      dbService.deleteDatabase().then(
        () => done(),
        (error) => done.fail(error)
      );
    });

    it(`Deve buscar um documento pelo id fazendo a junção dos campos. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const expectedDocument = Object.assign(
        {},
        documents[0],
        { customer: customers.find(item => item.id === documents[0].customerId) }
      );
      expectedDocument.items = expectedDocument.items.map(item => Object.assign(
        {},
        item,
        { product: products.find(prod => prod.id === item.productId) }
      ));
      dbService.addJoinGetByIdMap(collectionDocuments, {
        fieldId: 'customerId',
        collectionSource: collectionCustomers
      });
      dbService.addJoinGetByIdMap(collectionDocuments, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items'
      });
      // when
      dbService.get$(collectionDocuments, documents[0].id, undefined, collectionDocuments).subscribe(
        (response: IHttpResponse<IOutboundDocument>) => {
          // then
          expect(response.body).toEqual(expectedDocument);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve buscar todos os documentos fazendo a junção dos campos. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const expectedDocuments = documents.map(document => Object.assign(
        {},
        document,
        { customer: customers.find(item => item.id === document.customerId) }
      ));
      expectedDocuments.forEach(document => {
        document.items = document.items.map(item => Object.assign(
          {},
          item,
          { product: products.find(prod => prod.id === item.productId) }
        ))
      });
      expectedDocuments.sort((doc1: IOutboundDocument, doc2: IOutboundDocument) => {
        return (doc1.id > doc2.id) ? 1 : ((doc1.id < doc2.id) ? -1 : 0);
      });
      dbService.addJoinGetAllMap(collectionDocuments, {
        fieldId: 'customerId',
        collectionSource: collectionCustomers
      });
      dbService.addJoinGetAllMap(collectionDocuments, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items'
      });
      // when
      dbService.get$(collectionDocuments, undefined, undefined, collectionDocuments).subscribe(
        (response: IHttpResponse<IOutboundDocument[]>) => {
          // then
          expect(response.body).toEqual(expectedDocuments);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve excluir o campo ao fazer a junção do mesmo e renomear o retorno. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const expectedDocument = Object.assign(
        {},
        documents[0],
        { documentCustomer: customers.find(item => item.id === documents[0].customerId) }
      );
      delete expectedDocument.customerId;
      expectedDocument.items = expectedDocument.items.map(item => {
        const result = Object.assign(
          {},
          item,
          { itemProduct: products.find(prod => prod.id === item.productId) }
        );
        delete result.productId;
        return result
      });
      dbService.addJoinGetByIdMap(collectionDocuments, {
        fieldId: 'customerId',
        collectionSource: collectionCustomers,
        removeFieldId: true,
        fieldDest: 'documentCustomer'
      });
      dbService.addJoinGetByIdMap(collectionDocuments, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items',
        removeFieldId: true,
        fieldDest: 'itemProduct'
      });
      // when
      dbService.get$(collectionDocuments, documents[0].id, undefined, collectionDocuments).subscribe(
        (response: IHttpResponse<IOutboundDocument>) => {
          // then
          expect(response.body).toEqual(expectedDocument);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve fazer a junção e retornar apenas os campos passados no array para um retorno. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const mapCustomer = ({ id, name }: ICustomer) => ({ id, name });
      const expectedDocument = Object.assign(
        {},
        documents[0],
        { customer: mapCustomer(customers.find(item => item.id === documents[0].customerId)) }
      );
      delete expectedDocument.customerId;
      const mapProduct = ({ id, code, description }: IProduct) => ({ id, code, description });
      expectedDocument.items = expectedDocument.items.map(item => {
        const result = Object.assign(
          {},
          item,
          { product: mapProduct(products.find(prod => prod.id === item.productId)) }
        );
        delete result.productId;
        return result
      });
      dbService.addJoinGetByIdMap(collectionDocuments, {
        fieldId: 'customerId',
        collectionSource: collectionCustomers,
        removeFieldId: true,
        transformerGet: ['id', 'name']
      });
      dbService.addJoinGetByIdMap(collectionDocuments, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items',
        removeFieldId: true,
        transformerGet: ['id', 'code', 'description']
      });
      // when
      dbService.get$(collectionDocuments, documents[0].id, undefined, collectionDocuments).subscribe(
        (response: IHttpResponse<IOutboundDocument>) => {
          // then
          expect(response.body).toEqual(expectedDocument);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve fazer a junção e retornar os campos aplicando unwrap e rename. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const expectedDocuments = documents.map(document => {
        const customer = customers.find(item => item.id === document.customerId);
        const result = Object.assign(
          {},
          document,
          { customerName: customer.name }
        );
        result.items = result.items.map(item => {
          const product = products.find(prod => prod.id === item.productId);
          const resultItem = Object.assign(
            {},
            item,
            { productCode: product.code, productDescription: product.description }
          );
          return resultItem
        });
        return result;
      });
      dbService.addJoinGetAllMap(collectionDocuments, {
        fieldId: 'customerId',
        collectionSource: collectionCustomers,
        transformerGet: [{ field: 'name', property: 'customerName' }],
        unwrapField: true,
        fieldDest: 'customer' // to forçe warning message
      });
      dbService.addJoinGetAllMap(collectionDocuments, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items',
        transformerGet: [{ field: 'code', property: 'productCode' }, { field: 'description', property: 'productDescription' }],
        unwrapField: true,
      });
      expectedDocuments.sort((doc1: IOutboundDocument, doc2: IOutboundDocument) => {
        return (doc1.id > doc2.id) ? 1 : ((doc1.id < doc2.id) ? -1 : 0);
      });
      spyOn(console, 'warn').and.callThrough();
      // when
      dbService.get$(collectionDocuments, undefined, undefined, collectionDocuments).subscribe(
        (response: IHttpResponse<IOutboundDocument[]>) => {
          // then
          expect(response.body).toEqual(expectedDocuments);
          expect(console.warn).toHaveBeenCalledTimes(documents.length);
          done();
        },
        error => done.fail(error)
      );
    });

  });

});
