# Migrando da versão 6 para 7

Como na versão 7.0.0 a biblioteca deixou de ser uma biblioteca Angular para ser
uma biblioteca Javascript apenas, as classes e objetos que eram do angular
deixaram de exisitir na biblioteca passando a ser necessário criar os mesmos
no projeto que está utilizando a biblioteca para que continue funcionando
corretamente.

Foram as seguintes classes que deixaram de existir:

### Classes de uso para simular o backend mocado

`DownloadDataService`

- Serviço responsável por fazer download dos dados mocados permitindo salvar os dados para serem utilizados nos arquivos de mock.

`HttpClientBackendService`

- Serviço responsável por prover uma implementação da classe [HttpBackend](https://angular.io/api/common/http/HttpBackend).\
  Além disso faz a configuração de como deve ser uma resposta de sucesso e uma resposta de erro de acordo com o padrão do framework angular.

`WebBackendApiModule`

- Modulo responsável pela configuração do angular sobrepondo a implementação padrão do `HttpBackend`.

### Classes de uso em cenários de testes

`HttpClientTestingBackendService`

- Classe que implementa as mesmas funcionalidades da classe [HttpTestingController](https://angular.io/api/common/http/testing/HttpTestingController)

`WebBackendApiTestingModule`

- Modulo responsável pela configuração do angular para testes sobrepondo a
  implementação padrão do `HttpClientTestingModule`.

## Configuração do projeto

Para fazer a configuração do projeto, caso ainda não esteja utilizando é recomendado fazer a configuração via `enviroment`.\
Vide no [README](./README.md) na seção [Separate backend from production](./README.md#separate-backend-from-production)

## Migrando o código RxJs para Promise

### Um retorno simples

Antes:

```typescript
const responseFinalizar: ResponseInterceptorFn = (utils: IInterceptorUtils) => {
  return of(utils.fn.response(utils.url, 200, {}));
};
```

Depois:

```typescript
const responseFinalizar: ResponseInterceptorFn = (utils: IInterceptorUtils) => {
  return utils.fn.response(utils.url, 200, {});
};
```

### Um retorno com erro

Antes:

```typescript
const responseFinalizar: ResponseInterceptorFn = (utils: IInterceptorUtils) => {
  return throwError(() =>
    utils.fn.errorResponse(utils.url, 404, {
      code: "EntityNotFoundException",
      message: "Entidade não encontrada!",
    })
  );
};
```

Depois:

```typescript
const responseFinalizar: ResponseInterceptorFn = (utils: IInterceptorUtils) => {
  throw utils.fn.errorResponse(utils.url, 404, {
    code: 'EntityNotFoundException',
    message: 'Entidade não encontrada!'
  }
};
```

### Um retorno baseado numa consulta anterior

Antes com `getInstance$`:

```typescript
const responseReiniciar: ResponseInterceptorFn = (
  utils: IInterceptorUtils
): any => {
  return from(dbService.getInstance$(collectionName, utils.id)).pipe(
    concatMap((response: IConferenciaExpedicaoGetById) => {
      response.situacao = SituacaoConferenciaExpedicao.NAO_INICIADA;
      response.itens.forEach((item) => (item.quantidadeConferida = 0));
      return dbService.put$(collectionName, utils.id, response, utils.url).pipe(
        map((_response) => {
          _response.body = response;
          return _response;
        })
      );
    })
  );
};
```

Depois:

```typescript
const responseReiniciar: ResponseInterceptorFn = async (
  utils: IInterceptorUtils
): Promise<any> => {
  const response = await dbService.getInstance$<IConferenciaExpedicaoGetById>(
    collectionName,
    utils.id
  );

  response.situacao = SituacaoConferenciaExpedicao.NAO_INICIADA;
  response.itens.forEach((item) => (item.quantidadeConferida = 0));

  const _response = await dbService.put$(
    collectionName,
    utils.id,
    response,
    utils.url
  );

  _response.body = response;
  return _response;
};
```

Antes com `get$` e operador `map`:

```typescript
const responseSelecaoArmazenagem: ResponseInterceptorFn = (
  utils: IInterceptorUtils
): any => {
  return dbService.get$(collectionName, undefined, utils.query, utils.url).pipe(
    map((response: any) => {
      response.body.items.forEach((element) => {
        element.produto.descricaoMobile = element.produto.descricaoInterna;
        element.caracteristicas = element.caracteristicas.map((c) =>
          Object.assign(c, c.caracteristica)
        );
        element.saldoDisponivelSelecaoEstoque = element.saldoDisponivel;
        delete element.saldoDisponivel;
      });
      return response;
    })
  );
};
```

Depois:

```typescript
const responseSelecaoArmazenagem: ResponseInterceptorFn = async (
  utils: IInterceptorUtils
) => {
  const response = await dbService.get$<any>(
    collectionName,
    undefined,
    utils.query,
    utils.url
  );
  response.body.items.forEach((element) => {
    element.produto.descricaoMobile = element.produto.descricaoInterna;
    element.caracteristicas = element.caracteristicas.map((c) =>
      Object.assign(c, c.caracteristica)
    );
    element.saldoDisponivelSelecaoEstoque = element.saldoDisponivel;
    delete element.saldoDisponivel;
  });
  return response;
};
```

## Exemplos que não precisam de alteração

### Onde já utilizava uma resposta padrão

Nos casos onde não usava nenhum operador do RxJs com o `pipe`.

```typescript
const responseHistorico: ResponseInterceptorFn = (
  utils: IInterceptorUtils
): any => {
  const query = utils.query ? utils.query : new Map<string, string[]>();
  query.set("unidadeId", [unidadeId]);
  query.set("dataFim", [""]);
  dbService.addFieldFilterMap(collectionName, "dataFim", "ne");
  return dbService.get$(collectionName, undefined, query, utils.url);
};
```

```typescript
const responseInativar: ResponseInterceptorFn = (
  utils: IInterceptorUtils
): any => {
  return dbService.put$(
    collectionName,
    utils.id,
    { id: utils.id, situacao: "INATIVO" },
    utils.url
  );
};
```
