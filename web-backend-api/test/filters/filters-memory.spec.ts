import { BackendConfig } from '../../src/lib/data-service/backend-config';
import { clone } from '../../src/lib/data-service/backend.service';
import { IBackendService, IHttpResponse, LoadFn, MemoryDbService } from '../../src/public-api';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { collectionDocuments, outboundDocuments, IOutboundDocument } from './filter.mock';

const dataServiceFn = new Map<string, LoadFn[]>();
dataServiceFn.set(collectionDocuments, [(dbService: IBackendService) => {

  outboundDocuments.forEach(document => {
    void dbService.storeData(collectionDocuments, document).then(() => null);
  })
}]);

describe('Testes para cenários de filtros', () => {

  let dbService: MemoryDbService;

  beforeAll((done: DoneFn) => {
    dbService = new MemoryDbService(new BackendConfig({ pageEncapsulation: false }));
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
    dbService.clearFieldFilterMap(collectionDocuments);
    dbService.clearQuickFilterMap(collectionDocuments);
  })

  it('Deve aplicar o filtro básico por id', (done: DoneFn) => {
    // given
    const document = clone(outboundDocuments[0])
    // when
    dbService.get$(collectionDocuments, '1', undefined, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument>) => {
        // then
        expect(response.body).toEqual(document);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar o filtro básico por identificador', (done: DoneFn) => {
    // given
    const documents = clone(outboundDocuments.filter(doc => doc.identifier === '978342308'));
    const query = new Map<string, string[]>([['identifier', ['978342308']]]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body).toEqual(documents);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar o filtro de igualdade por identificador', (done: DoneFn) => {
    // given
    dbService.addFieldFilterMap(collectionDocuments, 'identifier', 'eq');
    const documents = clone(outboundDocuments.filter(doc => doc.identifier === '978342308'));
    const query = new Map<string, string[]>([['identifier', ['978342308']]]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body).toEqual(documents);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar o filtro de desigualdade por identificador', (done: DoneFn) => {
    // given
    dbService.addFieldFilterMap(collectionDocuments, 'identifier', 'ne');
    const documents = clone(outboundDocuments.filter(doc => doc.identifier !== '978342308'));
    const query = new Map<string, string[]>([['identifier', ['978342308']]]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body).toEqual(documents);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar um filtro com função customizada', (done: DoneFn) => {
    // given;
    dbService.addFieldFilterMap(collectionDocuments, 'customerId', (value: string, item: IOutboundDocument): boolean => {
      return item.customer.id === parseInt(value);
    });
    const documents = clone(outboundDocuments.filter(doc => doc.customerId === 2));
    const query = new Map<string, string[]>([['customerId', ['2']]]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body).toEqual(documents);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar um filtro com mais de uma função customizada', (done: DoneFn) => {
    // given
    dbService.addFieldFilterMap(collectionDocuments, 'customerId', (value: string, item: IOutboundDocument): boolean => {
      return item.customer.id === parseInt(value);
    });
    dbService.addFieldFilterMap(collectionDocuments, 'isLoaded', (value: string, item: IOutboundDocument): boolean => {
      return item.isLoaded === Boolean(value);
    });
    const documents = clone(outboundDocuments.filter(doc => doc.customerId === 2 && !doc.isLoaded));
    const query = new Map<string, string[]>([
      ['customerId', ['2']],
      ['isLoaded', ['true']]
    ]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body.length).toBe(1);
        expect(response.body).toEqual(documents);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar um filtro em um sub-item da coleção', (done: DoneFn) => {
    // given
    const documents = clone(outboundDocuments.filter(doc => doc.customerId === 2));
    const query = new Map<string, string[]>([['customer.id', ['2']]]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body).toEqual(documents);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar um filtro na coleção principal e em um sub-item da coleção sem retornar resultados', (done: DoneFn) => {
    // given
    const documents = [];
    const query = new Map<string, string[]>([
      ['identifier', ['4167161881']],
      ['customer.id', ['1']],
    ]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body.length).toBe(0);
        expect(response.body).toEqual(documents);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar um filtro na coleção principal e em um sub-item da coleção retornando resultados', (done: DoneFn) => {
    // given
    const documents = clone(outboundDocuments.filter(doc => doc.customerId === 2 && doc.isLoaded));
    const query = new Map<string, string[]>([
      ['isLoaded', ['true']],
      ['customer.id', ['2']],
    ]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body.length).toBe(1);
        expect(response.body).toEqual(documents);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar um filtro para o filtro rapido', (done: DoneFn) => {
    // given
    const documents = clone(outboundDocuments.filter(doc => /23451/.test(doc.identifier) && /23451/.test(doc.customer.name)));
    const query = new Map<string, string[]>([['searchTerm', ['23451']]]);
    dbService.addQuickFilterMap(collectionDocuments, {
      term: 'searchTerm',
      fields: ['identifier', 'customer.name']
    })
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body.length).toBe(1);
        expect(response.body).toEqual(documents);
        done();
      },
      error => done.fail(error)
    );
  })

});
