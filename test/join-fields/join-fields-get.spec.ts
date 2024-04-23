/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { IndexedDbService, MemoryDbService } from '../../src/data-service';
import { BackendConfig } from '../../src/data-service/backend-config';
import { IBackendService, IHttpResponse, IJoinField, LoadFn } from '../../src/interfaces';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { ICustomer, IOutboundDocument, IOutboundLoad, IProduct, collectionCustomers, collectionDocuments, collectionLoads, collectionProducts, customers, documents, loads, products } from './join-fields.mock';
import { cloneDeep } from '../../src/utils/deep-clone';

const dataServiceFn = new Map<string, LoadFn[]>();

dataServiceFn.set(collectionLoads, [(dbService: IBackendService) => {

  loads.forEach(load => {
    void dbService.storeData(collectionLoads, load).then(() => null);
  });
}]);

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

describe('Testes para JOIN de várias coleções com aplicação customizada para o get$', () => {

  [{ dbtype: 'memory' }, { dbtype: 'indexdb' }].forEach((dbType) => {
    let dbService: MemoryDbService | IndexedDbService;

    beforeAll(async () => {
      if (dbType.dbtype === 'memory') {
        dbService = new MemoryDbService(new BackendConfig({ pageEncapsulation: false, strategyId: 'uuid' }));
      } else {
        dbService = new IndexedDbService(new BackendConfig({ pageEncapsulation: false, strategyId: 'uuid' }));
      }
      configureBackendUtils(dbService);
      await dbService.createDatabase();
      await dbService.createObjectStore(dataServiceFn);
    });

    beforeEach(() => {
      dbService.clearJoinGetBothMap(collectionDocuments);
      dbService.clearFieldFilterMap(collectionDocuments);
    });

    afterAll(async () => {
      if (dbService instanceof IndexedDbService) {
        dbService.closeDatabase();
      }
      await dbService.deleteDatabase();
    });

    it(`Deve buscar um documento pelo id fazendo a junção dos campos. DbType: ${dbType.dbtype}`, (done) => {
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
      const joinFields: IJoinField[] = [{
        fieldId: 'customerId',
        collectionSource: collectionCustomers
      }, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items'
      }];
      // when
      dbService.get$(collectionDocuments, documents[0].id, undefined, collectionDocuments, joinFields).then(
        (response: IHttpResponse<IOutboundDocument>) => {
          // then
          expect(response.body).toEqual(expectedDocument);
          done();
        },
        error => done(error)
      );
    });

    it(`Deve buscar todos os documentos fazendo a junção dos campos. DbType: ${dbType.dbtype}`, (done) => {
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
      const joinFields: IJoinField[] = [{
        fieldId: 'customerId',
        collectionSource: collectionCustomers
      }, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items'
      }];
      // when
      dbService.get$(collectionDocuments, undefined, undefined, collectionDocuments, joinFields).then(
        (response: IHttpResponse<IOutboundDocument[]>) => {
          // then
          expect(response.body).toEqual(expectedDocuments);
          done();
        },
        error => done(error)
      );
    });

    it(`Deve excluir o campo ao fazer a junção do mesmo e renomear o retorno. DbType: ${dbType.dbtype}`, (done) => {
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
      dbService.get$(collectionDocuments, documents[0].id, undefined, collectionDocuments, joinFields).then(
        (response: IHttpResponse<IOutboundDocument>) => {
          // then
          expect(response.body).toEqual(expectedDocument);
          done();
        },
        error => done(error)
      );
    });

    it(`Deve fazer a junção e retornar apenas os campos passados no array no GetById. DbType: ${dbType.dbtype}`, (done) => {
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
      dbService.get$(collectionDocuments, documents[0].id, undefined, collectionDocuments, joinFields).then(
        (response: IHttpResponse<IOutboundDocument>) => {
          // then
          expect(response.body).toEqual(expectedDocument);
          done();
        },
        error => done(error)
      );
    });

    it(`Deve fazer a junção e retornar apenas os campos passados no array no GetAll. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const mapCustomer = ({ id, name }: ICustomer) => ({ id, name });
      const mapProduct = ({ id, code, description }: IProduct) => ({ id, code, description });
      const expectedDocuments = documents.map(document => {
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
      dbService.get$(collectionDocuments, undefined, undefined, collectionDocuments, joinFields).then(
        (response: IHttpResponse<IOutboundDocument[]>) => {
          // then
          expect(response.body).toEqual(expectedDocuments);
          done();
        },
        error => done(error)
      );
    });

    it(`Deve aplicar o sub-join pré configurado na collection. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const expectedLoad = cloneDeep(loads[0]);
      expectedLoad.documents = expectedLoad.documentsId.map(id => {
        let document = documents.find(doc => doc.id === id);
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
      dbService.get$(collectionLoads, expectedLoad.id, undefined, collectionLoads, joinFields).then(
        (response: IHttpResponse<IOutboundLoad>) => {
          // then
          expect(response.body).toEqual(expectedLoad);
          done();
        },
        error => done(error)
      );
    });

  });

});
