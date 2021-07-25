import { TestCase } from 'jasmine-data-provider-ts';
import { BackendConfig } from '../../src/lib/data-service/backend-config';
import { clone } from '../../src/lib/data-service/backend.service';
import { BackendTypeArgs, IBackendService, IHttpResponse, IJoinField, IndexedDbService, LoadFn, MemoryDbService } from '../../src/public-api';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { collectionCustomers, collectionDocuments, collectionLoads, collectionProducts, customers, documents, ICustomer, IOutboundDocument, IOutboundLoad, IProduct, loads, products } from './join-fields.mock';

const dataServiceFn = new Map<string, LoadFn[]>();

dataServiceFn.set(collectionLoads, [(dbService: IBackendService) => {

  loads.forEach(load => {
    void dbService.storeData(collectionLoads, clone(load)).then(() => null);
  });
}]);

dataServiceFn.set(collectionDocuments, [(dbService: IBackendService) => {

  documents.forEach(document => {
    void dbService.storeData(collectionDocuments, clone(document)).then(() => null);
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

describe('Testes para JOIN de várias coleções com aplicação customizada para o get$', () => {

  TestCase<BackendTypeArgs>([{ dbtype: 'memory' }, { dbtype: 'indexdb' }], (dbType) => {
    let dbService: MemoryDbService | IndexedDbService;

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
      if (dbService instanceof IndexedDbService) {
        dbService.closeDatabase();
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
        clone(documents[0]),
        { customer: customers.find(item => item.id === documents[0].customerId) }
      );
      expectedDocument.items = expectedDocument.items.map(item => Object.assign(
        {},
        item,
        { product: products.find(prod => prod.id === item.productId) }
      ));
      const joinFields: IJoinField[] = [{
        fieldId: 'customerId',
        collectionSource: collectionCustomers
      }, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items'
      }];
      // when
      dbService.get$(collectionDocuments, documents[0].id, undefined, collectionDocuments, joinFields).subscribe(
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
        clone(document),
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
      const joinFields: IJoinField[] = [{
        fieldId: 'customerId',
        collectionSource: collectionCustomers
      }, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items'
      }];
      // when
      dbService.get$(collectionDocuments, undefined, undefined, collectionDocuments, joinFields).subscribe(
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
        clone(documents[0]),
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
      const joinFields: IJoinField[] = [{
        fieldId: 'customerId',
        collectionSource: collectionCustomers,
        removeFieldId: true,
        fieldDest: 'documentCustomer'
      }, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items',
        removeFieldId: true,
        fieldDest: 'itemProduct'
      }];
      // when
      dbService.get$(collectionDocuments, documents[0].id, undefined, collectionDocuments, joinFields).subscribe(
        (response: IHttpResponse<IOutboundDocument>) => {
          // then
          expect(response.body).toEqual(expectedDocument);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve fazer a junção e retornar apenas os campos passados no array no GetById. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const mapCustomer = ({ id, name }: ICustomer) => ({ id, name });
      const expectedDocument = Object.assign(
        {},
        clone(documents[0]),
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
      const joinFields: IJoinField[] = [{
        fieldId: 'customerId',
        collectionSource: collectionCustomers,
        removeFieldId: true,
        transformerGet: ['id', 'name']
      }, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items',
        removeFieldId: true,
        transformerGet: ['id', 'code', 'description']
      }];
      // when
      dbService.get$(collectionDocuments, documents[0].id, undefined, collectionDocuments, joinFields).subscribe(
        (response: IHttpResponse<IOutboundDocument>) => {
          // then
          expect(response.body).toEqual(expectedDocument);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve fazer a junção e retornar apenas os campos passados no array no GetAll. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const mapCustomer = ({ id, name }: ICustomer) => ({ id, name });
      const mapProduct = ({ id, code, description }: IProduct) => ({ id, code, description });
      const expectedDocuments = clone(documents).map(document => {
        document = Object.assign(
          {},
          document,
          { customer: mapCustomer(customers.find(item => item.id === document.customerId)) }
        );
        delete document.customerId;
        document.items = document.items.map(item => {
          const result = Object.assign(
            {},
            item,
            { product: mapProduct(products.find(prod => prod.id === item.productId)) }
          );
          delete result.productId;
          return result
        });
        return document;
      });
      expectedDocuments.sort((doc1: IOutboundDocument, doc2: IOutboundDocument) => {
        return (doc1.id > doc2.id) ? 1 : ((doc1.id < doc2.id) ? -1 : 0);
      });
      const joinFields: IJoinField[] = [{
        fieldId: 'customerId',
        collectionSource: collectionCustomers,
        removeFieldId: true,
        transformerGet: ['id', 'name']
      }, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items',
        removeFieldId: true,
        transformerGet: ['id', 'code', 'description']
      }];
      // when
      dbService.get$(collectionDocuments, undefined, undefined, collectionDocuments, joinFields).subscribe(
        (response: IHttpResponse<IOutboundDocument[]>) => {
          // then
          expect(response.body).toEqual(expectedDocuments);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve aplicar o sub-join pré configurado na collection. DbType: ${dbType.dbtype}`, (done: DoneFn) => {
      // given
      const expectedLoad = clone(loads[0]);
      expectedLoad.documents = expectedLoad.documentsId.map(id => {
        let document = clone(documents.find(doc => doc.id === id));
        document = Object.assign(
          {},
          document,
          { customer: customers.find(item => item.id === document.customerId) }
        );
        document.items = document.items.map(item => Object.assign(
          {},
          item,
          { product: products.find(prod => prod.id === item.productId) }
        ));
        return document;
      });
      dbService.addJoinGetByIdMap(collectionDocuments, {
        fieldId: 'customerId',
        collectionSource: collectionCustomers
      });
      dbService.addJoinGetByIdMap(collectionDocuments, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items'
      });
      delete expectedLoad.documentsId;

      const joinFields: IJoinField[] = [{
        fieldId: 'documentsId',
        collectionSource: collectionDocuments,
        removeFieldId: true,
        joinFields: true
      }];
      // when
      dbService.get$(collectionLoads, expectedLoad.id, undefined, collectionLoads, joinFields).subscribe(
        (response: IHttpResponse<IOutboundLoad>) => {
          // then
          expect(response.body).toEqual(expectedLoad);
          done();
        },
        error => done.fail(error)
      );
    });

  });

});
