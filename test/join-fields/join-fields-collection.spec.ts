/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { IndexedDbService, MemoryDbService } from '../../src/data-service';
import { BackendConfig } from '../../src/data-service/backend-config';
import { IBackendService, IHttpResponse, LoadFn } from '../../src/interfaces';
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

describe('Testes para JOIN de várias coleções com a configuração através da coleção', () => {

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
      dbService.clearJoinGetBothMap(collectionLoads);
      dbService.clearFieldFilterMap(collectionLoads);
    });

    afterAll(async () => {
      if (dbType.dbtype === 'indexdb') {
        (dbService as IndexedDbService).closeDatabase();
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
      dbService.get$(collectionDocuments, documents[0].id, undefined, collectionDocuments).then(
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
      dbService.get$(collectionDocuments, undefined, undefined, collectionDocuments).then(
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
      dbService.get$(collectionDocuments, documents[0].id, undefined, collectionDocuments).then(
        (response: IHttpResponse<IOutboundDocument>) => {
          // then
          expect(response.body).toEqual(expectedDocument);
          done();
        },
        error => done(error)
      );
    });

    it(`Deve fazer a junção e retornar apenas os campos passados no array para um retorno. DbType: ${dbType.dbtype}`, (done) => {
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
      // To test addJoinGetByIdMap by both method
      dbService.addJoinGetBothMap(collectionDocuments, {
        fieldId: 'customerId',
        collectionSource: collectionCustomers,
        removeFieldId: true,
        transformerGet: ['id', 'name']
      });
      dbService.addJoinGetBothMap(collectionDocuments, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items',
        removeFieldId: true,
        transformerGet: ['id', 'code', 'description']
      });
      // when
      dbService.get$(collectionDocuments, documents[0].id, undefined, collectionDocuments).then(
        (response: IHttpResponse<IOutboundDocument>) => {
          // then
          expect(response.body).toEqual(expectedDocument);
          done();
        },
        error => done(error)
      );
    });

    it(`Deve fazer a junção e retornar os campos aplicando unwrap e rename. DbType: ${dbType.dbtype}`, (done) => {
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
      // To test addJoinGetAllMap by both method
      dbService.addJoinGetBothMap(collectionDocuments, {
        fieldId: 'customerId',
        collectionSource: collectionCustomers,
        transformerGet: [{ field: 'name', property: 'customerName' }],
        unwrapField: true,
        fieldDest: 'customer' // to forçe warning message
      });
      dbService.addJoinGetBothMap(collectionDocuments, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items',
        transformerGet: [{ field: 'code', property: 'productCode' }, { field: 'description', property: 'productDescription' }],
        unwrapField: true,
      });
      expectedDocuments.sort((doc1: IOutboundDocument, doc2: IOutboundDocument) => {
        return (doc1.id > doc2.id) ? 1 : ((doc1.id < doc2.id) ? -1 : 0);
      });
      jest.spyOn(console, 'warn');
      // when
      dbService.get$(collectionDocuments, undefined, undefined, collectionDocuments).then(
        (response: IHttpResponse<IOutboundDocument[]>) => {
          // then
          expect(response.body).toEqual(expectedDocuments);
          expect(console.warn).toHaveBeenCalledTimes(documents.length);
          done();
        },
        error => done(error)
      );
    });

    it(`Deve fazer a junção em uma colection de array de ids. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const expectedLoad = cloneDeep(loads[0]);
      expectedLoad.documents = expectedLoad.documentsId.map(id => cloneDeep(documents.find(doc => doc.id === id)));
      // expectedLoad.createdAt = new Date(expectedLoad.createdAt);
      delete expectedLoad.documentsId;
      // To test addJoinGetAllMap by both method
      dbService.addJoinGetByIdMap(collectionLoads, {
        fieldId: 'documentsId',
        collectionSource: collectionDocuments,
        unwrapField: true, // to forçe warning message
        removeFieldId: true,
      });
      jest.spyOn(console, 'warn');
      // when
      dbService.get$(collectionLoads, expectedLoad.id, undefined, collectionLoads).then(
        (response: IHttpResponse<IOutboundLoad>) => {
          // then
          expect(response.body).toEqual(expectedLoad);
          expect(console.warn).toHaveBeenCalledTimes(1);
          done();
        },
        error => done(error)
      );
    });

    it(`Deve fazer a junção com a configuração da sub-coleção para o GetById. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const mapCustomer = ({ id, name }: ICustomer) => ({ id, name });
      const mapProduct = ({ id, code, description }: IProduct) => ({ id, code, description });
      const expectedLoad = cloneDeep(loads[0]);
      expectedLoad.documents = expectedLoad.documentsId.map(id => {
        let document = documents.find(doc => doc.id === id);
        document = Object.assign(
          {},
          document,
          { customer: mapCustomer(customers.find(item => item.id === document.customerId)) }
        );
        document.items = document.items.map(item => Object.assign(
          {},
          item,
          { product: mapProduct(products.find(prod => prod.id === item.productId)) }
        ));
        return document;
      });
      delete expectedLoad.documentsId;
      dbService.addJoinGetByIdMap(collectionDocuments, {
        fieldId: 'customerId',
        collectionSource: collectionCustomers,
        transformerGet: ['id', 'name']
      });
      dbService.addJoinGetByIdMap(collectionDocuments, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items',
        transformerGet: true
      });
      dbService.addTransformGetByIdMap(collectionProducts, mapProduct);
      // To test addJoinGetAllMap by both method
      dbService.addJoinGetByIdMap(collectionLoads, {
        fieldId: 'documentsId',
        collectionSource: collectionDocuments,
        removeFieldId: true,
        joinFields: true
      });
      // To forçe ajust JOIN fields
      dbService.adjustJoinFields();
      // when
      dbService.get$(collectionLoads, expectedLoad.id, undefined, collectionLoads).then(
        (response: IHttpResponse<IOutboundLoad>) => {
          // then
          expect(response.body).toEqual(expectedLoad);
          done();
        },
        error => done(error)
      );
    });

    it(`Deve fazer a junção com a configuração da sub-coleção para o GetAll. DbType: ${dbType.dbtype}`, (done) => {
      // given
      const mapCustomer = ({ id, name }: ICustomer) => ({ id, name });
      const mapProduct = ({ id, code, description }: IProduct) => ({ id, code, description });
      const expectedLoads = cloneDeep(loads);
      expectedLoads.forEach(load => {
        load.documents = load.documentsId.map(id => {
          let document = documents.find(doc => doc.id === id);
          document = Object.assign(
            {},
            document,
            { customer: mapCustomer(customers.find(item => item.id === document.customerId)) }
          );
          document.items = document.items.map(item => Object.assign(
            {},
            item,
            { product: mapProduct(products.find(prod => prod.id === item.productId)) }
          ));
          return document;
        });
        delete load.documentsId;
      });
      dbService.addJoinGetAllMap(collectionDocuments, {
        fieldId: 'customerId',
        collectionSource: collectionCustomers,
        transformerGet: ['id', 'name']
      });
      dbService.addJoinGetAllMap(collectionDocuments, {
        fieldId: 'productId',
        collectionSource: collectionProducts,
        collectionField: 'items',
        transformerGet: true
      });
      dbService.addTransformGetAllMap(collectionProducts, mapProduct);
      // To test addJoinGetAllMap by both method
      dbService.addJoinGetAllMap(collectionLoads, {
        fieldId: 'documentsId',
        collectionSource: collectionDocuments,
        removeFieldId: true,
        joinFields: true
      });
      // To forçe ajust JOIN fields
      dbService.adjustJoinFields();
      // when
      dbService.get$(collectionLoads, undefined, undefined, collectionLoads).then(
        (response: IHttpResponse<IOutboundLoad[]>) => {
          // then
          expect(response.body).toEqual(expectedLoads);
          done();
        },
        error => done(error)
      );
    });

  });

});
