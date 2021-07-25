import { TestCase } from 'jasmine-data-provider-ts';
import { cloneDeep } from 'lodash-es';
import { defer, of } from 'rxjs';
import { BackendConfig } from '../../src/lib/data-service/backend-config';
import { BackendTypeArgs, IBackendService, IHttpResponse, IndexedDbService, LoadFn, MemoryDbService } from '../../src/public-api';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { collectionProducts, IProduct, products } from './transformers.mock';

function getDateWithoutSeconds(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0);
}

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

const transformePut = (product: IProduct, body: Partial<IProduct>): IProduct => {
  body.updatedAt = getDateWithoutSeconds();
  return body as IProduct;
}

describe('Testes para as funções de trasnformação', () => {

  TestCase<BackendTypeArgs>([{ dbtype: 'memory' }, { dbtype: 'indexdb' }], (dbType) => {
    let dbService: MemoryDbService | IndexedDbService;
    const backendConfig = new BackendConfig({
      pageEncapsulation: false,
      dataEncapsulation: true,
      put204: false,
      strategyId: 'provided'
    })

    beforeAll((done: DoneFn) => {
      if (dbType.dbtype === 'memory') {
        dbService = new MemoryDbService(backendConfig);
      } else {
        dbService = new IndexedDbService(backendConfig);
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
      dbService.clearTransformGetBothMap(collectionProducts);
      dbService.clearTransformPostMap(collectionProducts);
      dbService.clearTransformPutMap(collectionProducts);
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

    it('Deve aplicar a transformação no GetById', (done: DoneFn) => {
      // given
      dbService.addTransformGetByIdMap(collectionProducts, transformeGet);
      const expectedProduct = transformeGet(transformePost(cloneDeep(products[0])));
      // when
      dbService.get$(collectionProducts, products[0].id, undefined, collectionProducts).subscribe(
        (response: IHttpResponse<{ data: IProduct }>) => {
          // then
          expect(response.body).toEqual({ data: expectedProduct });
          done();
        },
        error => done.fail(error)
      );
    });

    it('Deve aplicar a transformação no GetAll', (done: DoneFn) => {
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
        dbService.get$(collectionProducts, undefined, undefined, collectionProducts).subscribe(
          (response: IHttpResponse<{ data: IProduct[] }>) => {
            // then
            expect(response.body).toEqual({ data: expectedProducts });
            done();
          },
          error => done.fail(error)
        );
      });
    });

    it('Deve aplicar a transformação no Post', (done: DoneFn) => {
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
      dbService.post$(collectionProducts, undefined, { ...postProduct }, collectionProducts).subscribe(
        (response: IHttpResponse<{ data: IProduct }>) => {
          // then
          expect(response.body).toEqual({ data: expectedProduct });
          done();
        },
        error => done.fail(error)
      );
    });

    it('Deve aplicar a transformação no Put', (done: DoneFn) => {
      // given
      dbService.addTransformPutMap(collectionProducts, transformePut);
      const expectedProduct = transformePut(null, transformePost(cloneDeep(products[1])));
      expectedProduct.active = false;
      // when
      dbService.put$(collectionProducts, products[1].id, { active: false }, collectionProducts).subscribe(
        (response: IHttpResponse<{ data: IProduct }>) => {
          // then
          expect(response.body).toEqual({ data: expectedProduct });
          done();
        },
        error => done.fail(error)
      );
    });

    it('Deve aplicar a transformação no GetById com Observable', (done: DoneFn) => {
      // given
      const transformeGet$ = (product: IProduct) => defer(() => of(transformeGet(product)));
      dbService.addTransformGetByIdMap(collectionProducts, transformeGet$);
      const expectedProduct = transformeGet(transformePost(cloneDeep(products[0])));
      // when
      dbService.get$(collectionProducts, products[0].id, undefined, collectionProducts).subscribe(
        (response: IHttpResponse<{ data: IProduct }>) => {
          // then
          expect(response.body).toEqual({ data: expectedProduct });
          done();
        },
        error => done.fail(error)
      );
    });

    it('Deve aplicar a transformação no Post com Observable', (done: DoneFn) => {
      // given
      const transformePost$ = (product: IProduct) => defer(() => of(transformePost(product)));
      dbService.addTransformPostMap(collectionProducts, transformePost$);
      const postProduct: IProduct = {
        id: '987654321',
        code: '987654321',
        codBar: '987654321',
        description: 'Product test'
      }
      const expectedProduct = transformePost(cloneDeep(postProduct));
      // when
      dbService.post$(collectionProducts, undefined, { ...postProduct }, collectionProducts).subscribe(
        (response: IHttpResponse<{ data: IProduct }>) => {
          // then
          expect(response.body).toEqual({ data: expectedProduct });
          done();
        },
        error => done.fail(error)
      );
    });

    it('Deve aplicar a transformação no Put com Observable', (done: DoneFn) => {
      // given
      const transformePut$ = (product: IProduct, body: Partial<IProduct>) => defer(() => of(transformePut(product, body)));
      dbService.addTransformPutMap(collectionProducts, transformePut$);
      const expectedProduct = transformePut(null, transformePost(cloneDeep(products[1])));
      expectedProduct.active = false;
      // when
      dbService.put$(collectionProducts, products[1].id, { active: false }, collectionProducts).subscribe(
        (response: IHttpResponse<{ data: IProduct }>) => {
          // then
          expect(response.body).toEqual({ data: expectedProduct });
          done();
        },
        error => done.fail(error)
      );
    });

  });

});
