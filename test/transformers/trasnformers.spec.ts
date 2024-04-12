/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { IndexedDbService, MemoryDbService } from '../../src/data-service';
import { BackendConfig } from '../../src/data-service/backend-config';
import { IBackendService, IHttpResponse, LoadFn } from '../../src/interfaces';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { getDateWithoutSeconds } from '../utils/date-utils';
import { IProduct, collectionProducts, products } from './transformers.mock';
import * as cloneDeep from 'clonedeep';

const dataServiceFn = new Map<string, LoadFn[]>();

dataServiceFn.set(collectionProducts, [(dbService: IBackendService) => {

  products.forEach(product => {
    void dbService.storeData(collectionProducts, transformePost(cloneDeep(product))).then(() => null);
  });
}]);

const transformeGet = (product: IProduct): IProduct & { codeDescription: string } => {
  return Object.assign(product, { codeDescription: product.code + ' - ' + product.description });
}

const transformePost = (product: IProduct): IProduct => {
  if (!product.hasOwnProperty('active')) {
    product.active = true;
  }
  product.createdAt = getDateWithoutSeconds();
  return product;
}

const transformePut = (_product: IProduct, body: Partial<IProduct>): IProduct => {
  body.updatedAt = getDateWithoutSeconds();
  return body as IProduct;
}

describe('Testes para as funções de transformação', () => {

  [{ dbtype: 'memory' }, { dbtype: 'indexdb' }].forEach((dbType) => {
    let dbService: MemoryDbService | IndexedDbService;
    const backendConfig = new BackendConfig({
      pageEncapsulation: false,
      dataEncapsulation: true,
      returnItemIn201: true,
      put204: false,
      strategyId: 'provided',
      jsonParseWithDate: false,
      delay: 0
    })

    beforeAll(async () => {
      if (dbType.dbtype === 'memory') {
        dbService = new MemoryDbService(backendConfig);
      } else {
        dbService = new IndexedDbService(backendConfig);
      }
      configureBackendUtils(dbService);
      await dbService.createDatabase();
      await dbService.createObjectStore(dataServiceFn);
    });

    beforeEach(() => {
      dbService.clearTransformGetBothMap(collectionProducts);
      dbService.clearTransformPostMap(collectionProducts);
      dbService.clearTransformPutMap(collectionProducts);
    });

    afterAll(async () => {
      if (dbService instanceof IndexedDbService) {
        dbService.closeDatabase();
      }
      await dbService.deleteDatabase();
    });

    it('Deve aplicar a transformação no GetById', (done) => {
      // given
      dbService.addTransformGetByIdMap(collectionProducts, transformeGet);
      const expectedProduct = transformeGet(transformePost(cloneDeep(products[0])));
      // when
      dbService.get$(collectionProducts, products[0].id, undefined, collectionProducts).then(
        (response: IHttpResponse<{ data: IProduct }>) => {
          // then
          expect(response.body).toEqual({ data: expectedProduct });
          done();
        },
        error => done(error)
      );
    });

    it('Deve aplicar a transformação no GetAll', (done) => {
      void (async (): Promise<void> => {
        await dbService.clearData(collectionProducts);
        for (const product of products) {
          await dbService.storeData(collectionProducts, transformePost(cloneDeep(product)));
        }
      })().then(() => {
        // given
        dbService.addTransformGetAllMap(collectionProducts, transformeGet);
        const expectedProducts = products.map(product => transformeGet(transformePost(cloneDeep(product))));
        // when
        dbService.get$(collectionProducts, undefined, undefined, collectionProducts).then(
          (response: IHttpResponse<{ data: IProduct[] }>) => {
            // then
            try {
              expect(response.body).toEqual({ data: expectedProducts }); 
              done();             
            } catch (error) {
              done(error);
            }
          },
          error => done(error)
        );
      });
    });

    it('Deve aplicar a transformação no Post', (done) => {
      // given
      dbService.addTransformPostMap(collectionProducts, transformePost);
      const postProduct: IProduct = {
        id: '123456789',
        code: '123456789',
        codBar: '123456789',
        description: 'Product test'
      }
      const expectedProduct = transformePost(cloneDeep(postProduct));
      // when
      dbService.post$(collectionProducts, undefined, { ...postProduct }, collectionProducts).then(
        (response: IHttpResponse<{ data: IProduct }>) => {
          // then
          expect(response.body).toEqual({ data: expectedProduct });
          done();
        },
        error => done(error)
      );
    });

    it('Deve aplicar a transformação no Put', (done) => {
      // given
      dbService.addTransformPutMap(collectionProducts, transformePut);
      const expectedProduct = transformePut(null, transformePost(cloneDeep(products[1])));
      expectedProduct.active = false;
      // when
      dbService.put$(collectionProducts, products[1].id, { active: false }, collectionProducts).then(
        (response: IHttpResponse<{ data: IProduct }>) => {
          // then
          expect(response.body).toEqual({ data: expectedProduct });
          done();
        },
        error => done(error)
      );
    });

    it('Deve aplicar a transformação no GetById com Promise', (done) => {
      // given
      const transformeGet$ = (product: IProduct) => new Promise(resolve => resolve(transformeGet(product)));
      dbService.addTransformGetByIdMap(collectionProducts, transformeGet$);
      const expectedProduct = transformeGet(transformePost(cloneDeep(products[0])));
      // when
      dbService.get$(collectionProducts, products[0].id, undefined, collectionProducts).then(
        (response: IHttpResponse<{ data: IProduct }>) => {
          // then
          expect(response.body).toEqual({ data: expectedProduct });
          done();
        },
        error => done(error)
      );
    });

    it('Deve aplicar a transformação no Post com Promise', (done) => {
      // given
      const transformePost$ = (product: IProduct) => new Promise(resolve => resolve(transformePost(product)));
      dbService.addTransformPostMap(collectionProducts, transformePost$);
      const postProduct: IProduct = {
        id: '987654321',
        code: '987654321',
        codBar: '987654321',
        description: 'Product test'
      }
      const expectedProduct = transformePost(cloneDeep(postProduct));
      // when
      dbService.post$(collectionProducts, undefined, { ...postProduct }, collectionProducts).then(
        (response: IHttpResponse<{ data: IProduct }>) => {
          // then
          expect(response.body).toEqual({ data: expectedProduct });
          done();
        },
        error => done(error)
      );
    });

    it('Deve aplicar a transformação no Put com Promise', (done) => {
      // given
      const transformePut$ = (product: IProduct, body: Partial<IProduct>) => new Promise(resolve => resolve(transformePut(product, body)));
      dbService.addTransformPutMap(collectionProducts, transformePut$);
      const expectedProduct = transformePut(null, transformePost(cloneDeep(products[1])));
      expectedProduct.active = false;
      // when
      dbService.put$(collectionProducts, products[1].id, { active: false }, collectionProducts).then(
        (response: IHttpResponse<{ data: IProduct }>) => {
          // then
          expect(response.body).toEqual({ data: expectedProduct });
          done();
        },
        error => done(error)
      );
    });

  });

});
