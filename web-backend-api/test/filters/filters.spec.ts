import { cloneDeep } from 'lodash';
import { BackendConfig } from '../../src/lib/data-service/backend-config';
import { IBackendService, IHttpResponse, LoadFn, MemoryDbService } from '../../src/public-api';
import { configureBackendUtils } from '../utils/configure-backend-utils';
import { collectionDocuments, documents, IOutboundDocument } from './filters.mock';

const dataServiceFn = new Map<string, LoadFn[]>();
dataServiceFn.set(collectionDocuments, [(dbService: IBackendService) => {

  documents.forEach(document => {
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
    const expectedDocument = cloneDeep(documents[0])
    // when
    dbService.get$(collectionDocuments, '1', undefined, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument>) => {
        // then
        expect(response.body).toEqual(expectedDocument);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar o filtro básico por identificador', (done: DoneFn) => {
    // given
    const expectedDocuments = cloneDeep(documents.filter(doc => doc.identifier === '978342308'));
    const query = new Map<string, string[]>([['identifier', ['978342308']]]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar o filtro de igualdade por identificador', (done: DoneFn) => {
    // given
    dbService.addFieldFilterMap(collectionDocuments, 'identifier', 'eq');
    const expectedDocuments = cloneDeep(documents.filter(doc => doc.identifier === '978342308'));
    const query = new Map<string, string[]>([['identifier', ['978342308']]]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar o filtro de desigualdade por identificador', (done: DoneFn) => {
    // given
    dbService.addFieldFilterMap(collectionDocuments, 'identifier', 'ne');
    const expectedDocuments = cloneDeep(documents.filter(doc => doc.identifier !== '978342308'));
    const query = new Map<string, string[]>([['identifier', ['978342308']]]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body).toEqual(expectedDocuments);
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
    const expectedDocuments = cloneDeep(documents.filter(doc => doc.customerId === 2));
    const query = new Map<string, string[]>([['customerId', ['2']]]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body).toEqual(expectedDocuments);
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
      return item.isLoaded === ((value === 'true' ? true : false));
    });
    const expectedDocuments = cloneDeep(documents.filter(doc => doc.customerId === 2 && !doc.isLoaded));
    const query = new Map<string, string[]>([
      ['customerId', ['2']],
      ['isLoaded', ['false']]
    ]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body.length).toBe(1);
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar um filtro em um sub-item da coleção', (done: DoneFn) => {
    // given
    const expectedDocuments = cloneDeep(documents.filter(doc => doc.customerId === 2));
    const query = new Map<string, string[]>([['customer.id', ['2']]]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar um filtro na coleção principal e em um sub-item da coleção sem retornar resultados', (done: DoneFn) => {
    // given
    const expectedDocuments = [];
    const query = new Map<string, string[]>([
      ['identifier', ['4167161881']],
      ['customer.id', ['1']],
    ]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body.length).toBe(0);
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar um filtro na coleção principal e em um sub-item da coleção retornando resultados', (done: DoneFn) => {
    // given
    const expectedDocuments = cloneDeep(documents.filter(doc => doc.customerId === 2 && doc.isLoaded));
    const query = new Map<string, string[]>([
      ['isLoaded', ['true']],
      ['customer.id', ['2']],
    ]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body.length).toBe(1);
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar um filtro para o filtro rapido', (done: DoneFn) => {
    // given
    const expectedDocuments = cloneDeep(documents.filter(doc => /23451/.test(doc.identifier) && /23451/.test(doc.customer.name)));
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
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar um filtro para o filtro rapido mais um filtro customizado', (done: DoneFn) => {
    // given
    const expectedDocuments = cloneDeep(documents.filter(doc => /23451/.test(doc.identifier) && /23451/.test(doc.customer.name)));
    const query = new Map<string, string[]>([
      ['searchTerm', ['23451']],
      ['customerId', ['2']]
    ]);
    dbService.addQuickFilterMap(collectionDocuments, {
      term: 'searchTerm',
      fields: ['identifier', 'customer.name']
    });
    dbService.addFieldFilterMap(collectionDocuments, 'customerId', 'eq');
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body.length).toBe(1);
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Deve aplicar um filtro para o filtro rapido customizado mais um filtro padrão', (done: DoneFn) => {
    // given
    const expectedDocuments = cloneDeep(documents.filter(doc => /23451/.test(doc.identifier) && /23451/.test(doc.customer.name)));
    const query = new Map<string, string[]>([
      ['searchTerm', ['23451']],
      ['customerId', ['2']]
    ]);
    dbService.addQuickFilterMap(collectionDocuments, {
      term: 'searchTerm',
      fields: ['identifier', 'customer.name']
    });
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body.length).toBe(1);
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Ao tentar aplicar um filtro para uma proprieade inexistente não deve retornar resultados', (done: DoneFn) => {
    // given
    const expectedDocuments = [];
    const query = new Map<string, string[]>([
      ['notExistingField', ['23451']]
    ]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body.length).toBe(0);
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Ao tentar aplicar um filtro para uma proprieade filha inexistente não deve retornar resultados', (done: DoneFn) => {
    // given
    const expectedDocuments = [];
    const query = new Map<string, string[]>([
      ['notExistingChild.property', ['23451']]
    ]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body.length).toBe(0);
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

  it('Ao aplicar um filtro com array deve retornar os resultados', (done: DoneFn) => {
    // given
    const expectedDocuments = cloneDeep(documents.filter(doc => doc.identifier === '4167161881' || doc.identifier === '2226863794'));
    const query = new Map<string, string[]>([
      ['identifier', ['4167161881', '2226863794']]
    ]);
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

  it('deve aplicar um filtro com condição de maior que `>`', (done: DoneFn) => {
    // given
    const expectedDocuments = cloneDeep(documents.filter(doc => doc.customerId > 3));
    const query = new Map<string, string[]>([
      ['customerId', ['3']]
    ]);
    dbService.addFieldFilterMap(collectionDocuments, 'customerId', 'gt');
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

  it('deve aplicar um filtro com condição de maior ou igual a `>=`', (done: DoneFn) => {
    // given
    const expectedDocuments = cloneDeep(documents.filter(doc => doc.customerId >= 3));
    const query = new Map<string, string[]>([
      ['customerId', ['3']]
    ]);
    dbService.addFieldFilterMap(collectionDocuments, 'customerId', 'ge');
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

  it('deve aplicar um filtro com condição de menor que `<`', (done: DoneFn) => {
    // given
    const expectedDocuments = cloneDeep(documents.filter(doc => doc.customerId < 3));
    const query = new Map<string, string[]>([
      ['customerId', ['3']]
    ]);
    dbService.addFieldFilterMap(collectionDocuments, 'customerId', 'lt');
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

  it('deve aplicar um filtro com condição de menor ou igual a `<=`', (done: DoneFn) => {
    // given
    const expectedDocuments = cloneDeep(documents.filter(doc => doc.customerId <= 3));
    const query = new Map<string, string[]>([
      ['customerId', ['3']]
    ]);
    dbService.addFieldFilterMap(collectionDocuments, 'customerId', 'le');
    // when
    dbService.get$(collectionDocuments, undefined, query, collectionDocuments).subscribe(
      (response: IHttpResponse<IOutboundDocument[]>) => {
        // then
        expect(response.body).toEqual(expectedDocuments);
        done();
      },
      error => done.fail(error)
    );
  })

});
