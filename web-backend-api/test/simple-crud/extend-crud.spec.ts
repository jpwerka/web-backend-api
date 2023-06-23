/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { TestCase } from 'jasmine-data-provider-ts';
import { cloneDeep } from 'lodash';
import { BackendConfig } from '../../database/src/data-service/backend-config';
import { IBackendService, IHttpResponse, IPostToOtherMethod, IRequestCore, LoadFn, MemoryDbService, STATUS } from '../../public-api';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { ICustomer, collectionCustomers, customers } from './simple-crud.mock';

const postsToOtherMethod: IPostToOtherMethod[] = [
  {
    otherMethod: 'DELETE',
    applyTo: 'urlSegment',
    value: 'excluir'
  },
  {
    otherMethod: 'DELETE',
    applyTo: 'queryParam',
    value: 'delete',
    param: 'action'
  },
  {
    otherMethod: 'DELETE',
    applyTo: 'bodyParam',
    value: 'delete',
    param: 'operation'
  },
  {
    otherMethod: 'PUT',
    applyTo: 'urlSegment',
    value: 'alterar'
  },
  {
    otherMethod: 'PUT',
    applyTo: 'queryParam',
    value: 'update',
    param: 'action'
  },
  {
    otherMethod: 'PUT',
    applyTo: 'bodyParam',
    value: 'update',
    param: 'operation'
  }
];

describe('Testes para uma aplicação CRUD com extensões', () => {
  interface ITestPostToOtherMethod {
    whereIsConfig: 'database' | 'collection';
    postsToOtherMethod: IPostToOtherMethod[];
  }

  TestCase<ITestPostToOtherMethod>([
    { whereIsConfig: 'database', postsToOtherMethod },
    { whereIsConfig: 'collection', postsToOtherMethod }
  ], (postToOtherMethodConfig: ITestPostToOtherMethod) => {
    let dbService: MemoryDbService;

    const backendConfig = new BackendConfig({
      apiBase: '/',
      returnItemIn201: true, // return the item in body after POST
      put204: false, // return the item in body after PUT
      pageEncapsulation: false,
      delay: 0,
      postsToOtherMethod: postToOtherMethodConfig.whereIsConfig === 'database' ? postToOtherMethodConfig.postsToOtherMethod : undefined
    });

    const dataServiceFn = new Map<string, LoadFn[]>();

    dataServiceFn.set(collectionCustomers, [(dbService: IBackendService) => {

      if (postToOtherMethodConfig.whereIsConfig === 'collection') {
        postToOtherMethodConfig.postsToOtherMethod.forEach(postToOtherMethod => {
          dbService.addPostToOtherMethodMap(collectionCustomers, postToOtherMethod);
        });
      }

    }]);

    beforeAll((done: DoneFn) => {
      dbService = new MemoryDbService(backendConfig);
      configureBackendUtils(dbService);
      dbService.createDatabase().then(
        () => dbService.createObjectStore(dataServiceFn).then(
          () => done(),
          error => done.fail(error)
        ),
        error => done.fail(error)
      );
    });

    afterAll((done: DoneFn) => {
      dbService.deleteDatabase().then(
        () => done(),
        (error) => done.fail(error)
      );
    })

    beforeEach((done: DoneFn) => {
      void (async (): Promise<void> => {
        await dbService.clearData(collectionCustomers);
        for (const customer of customers) {
          await dbService.storeData(collectionCustomers, cloneDeep(customer));
        }
      })().then(() => done());
    })

    it(`Deve chamar o método PUT mesmo passando uma requisição de POST por Segmento URL.`, (done: DoneFn) => {
      // given
      const expectedCustomer = cloneDeep(customers[0]);
      expectedCustomer.name = 'Cliente 01 nome alterado';
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http://localhost:4200/${collectionCustomers}/1/alterar`,
        body: {
          name: 'Cliente 01 nome alterado'
        }
      };

      const spyPut$ = spyOn(dbService, 'put$').and.callThrough();
      // when
      dbService.handleRequest(req).subscribe(
        (response: IHttpResponse<ICustomer>) => {
          // then
          expect(spyPut$).toHaveBeenCalled();
          expect(response.body).toEqual(expectedCustomer);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve chamar o método PUT mesmo passando uma requisição de POST por QueryParam.`, (done: DoneFn) => {
      // given
      const expectedCustomer = cloneDeep(customers[0]);
      expectedCustomer.name = 'Cliente 01 nome alterado';
      const req: IRequestCore<Partial<ICustomer>> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}/1?action=update`,
        body: {
          name: 'Cliente 01 nome alterado'
        }
      };
      const spyPut$ = spyOn(dbService, 'put$').and.callThrough();
      // when
      dbService.handleRequest(req).subscribe(
        (response: IHttpResponse<ICustomer>) => {
          // then
          expect(spyPut$).toHaveBeenCalled();
          expect(response.body).toEqual(expectedCustomer);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve chamar o método PUT mesmo passando uma requisição de POST por BodyParam.`, (done: DoneFn) => {
      // given
      const expectedCustomer = cloneDeep(customers[0]);
      expectedCustomer.name = 'Cliente 01 nome alterado';
      const req: IRequestCore<Partial<ICustomer> & { operation: string }> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}/1`,
        body: {
          operation: 'update',
          name: 'Cliente 01 nome alterado'
        }
      };
      const spyPut$ = spyOn(dbService, 'put$').and.callThrough();
      // when
      dbService.handleRequest(req).subscribe(
        (response: IHttpResponse<ICustomer>) => {
          // then
          expect(spyPut$).toHaveBeenCalled();
          expect(response.body).toEqual(expectedCustomer);
          done();
        },
        error => done.fail(error)
      );
    });


    it(`Deve chamar o método DELETE mesmo passando uma requisição de POST por Segmento URL.`, (done: DoneFn) => {
      // given
      const req: IRequestCore<null> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}/1/excluir`,
      };
      const spyDelete$ = spyOn(dbService, 'delete$').and.callThrough();
      // when
      dbService.handleRequest(req).subscribe(
        (response: IHttpResponse<null>) => {
          // then
          expect(spyDelete$).toHaveBeenCalled();
          expect(response.status).toEqual(STATUS.NO_CONTENT);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve chamar o método DELETE mesmo passando uma requisição de POST por QueryParam.`, (done: DoneFn) => {
      // given
      const req: IRequestCore<null> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}/2?action=delete`,
      };
      const spyDelete$ = spyOn(dbService, 'delete$').and.callThrough();
      // when
      dbService.handleRequest(req).subscribe(
        (response: IHttpResponse<null>) => {
          // then
          expect(spyDelete$).toHaveBeenCalled();
          expect(response.status).toEqual(STATUS.NO_CONTENT);
          done();
        },
        error => done.fail(error)
      );
    });

    it(`Deve chamar o método DELETE mesmo passando uma requisição de POST por BodyParam.`, (done: DoneFn) => {
      // given
      const req: IRequestCore<{ operation: string }> = {
        method: 'POST',
        url: `http://localhost/${collectionCustomers}/3`,
        body: {
          operation: 'delete',
        }
      };
      const spyDelete$ = spyOn(dbService, 'delete$').and.callThrough();
      // when
      dbService.handleRequest(req).subscribe(
        (response: IHttpResponse<null>) => {
          // then
          expect(spyDelete$).toHaveBeenCalled();
          expect(response.status).toEqual(STATUS.NO_CONTENT);
          done();
        },
        error => done.fail(error)
      );
    });

  });

});

