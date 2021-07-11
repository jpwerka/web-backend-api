import { Observable } from 'rxjs';
// tslint:disable-next-line: max-line-length
import { IErrorMessage, IHttpErrorResponse, IHttpResponse, IPassThruBackend, IRequestCore, IRequestInterceptor, IPostToOtherMethod } from './interceptor.interface';
import { FilterFn, FilterOp, IQuickFilter, IQueryFilter } from './query.interface';

/**
 * Tipo para uma assinatura de função de callback a ser aplicada para a configuração
 * e/ou carga inicial de dados de uma coleção de dados.
 * Esta função deve ser passada como callback para a função de mapeamento `dataService`
 * @param dbService - Instância do serviço de backend
 */
export type LoadFn = (dbService: IBackendService) => void;

/**
 * Tipo para uma assinatura de função de callback a ser aplicada sobre um item a ser recuperado do backend.
 * Este tipo será utilizado para fazer os mapeamentos nos endpoints de GetAll e GetById
 * @param item - Instância do item da coleção conforme está `persistido` no backend
 * @param dbService - Instância do serviço de backend
 */
export type TransformGetFn = (item: any, dbService: IBackendService) => any | Observable<any>;

/**
 * Tipo para uma assinatura de função de callback a ser aplicada sobre um item a ser persistido no backend.
 * Este tipo será utilizado para fazer os mapeamentos nos endpoints de Post ou Put quando `config.put404 = false`
 * @param body - Conteúdo do corpo da requisição
 * @param dbService - Instância do serviço de backend
 */
export type TransformPostFn = (body: any, dbService: IBackendService) => any | Observable<any>;

/**
 * Tipo para uma assinatura de função de callback a ser aplicada sobre um item a ser persistido no backend.
 * Este tipo será utilizado para fazer os mapeamentos nos endpoints de Put ou Post quando `config.post409 = false`
 * @param item - Instância do item da coleção conforme está `persistido` no backend
 * @param body - Conteúdo do corpo da requisição
 * @param dbService - Instância do serviço de backend
 */
export type TransformPutFn = (item: any, body: any, dbService: IBackendService) => any | Observable<any>;

/**
 * Interface que permite o mapeamento dos JOINs a serem feitos ao recuperar um item da coleção
 */
export interface IJoinField {
  /**
   * Campo que contém o valor a ser utilizado como chave para busca na coleção de origem
   */
  fieldId: string;
  /**
   * Nome da coleção de origem que contém os dados a serem pesquisados
   * @obs Sempre será feito a pesquisa pelo campo ID na coleção origem
   */
  collectionSource: string;
  /**
   * Nome do campo do tipo array ou objeto na coleção de origem que contém
   * o campo a ser utilizado como id `fieldId` de busca para o JOIN.
   */
  collectionField?: string;
  /**
   * (Opcional) Campo destino que irá conter as propriedades do objeto recuperado
   * @obs Caso não seja passado será utilizado o `fieldId` retirando o id do final
   */
  fieldDest?: string;
  /**
   * (Opcional) Lista de proprieadades a serem retornadas do item da coleção origem
   * ou uma instância de função que irá fazer esta transformação ao recuperar o item da coleção.
   * Caso na lista seja passado o par: `field` e `property` o campo será retornado com o nome
   * especificado na propriedade.
   * @obs Caso seja passado `true` será utilizado a função de transformação da coleção
   * de origem dos dados, caso a mesma exista.
   * @alias addTransformGetByIdMap
   * @alias addTransformGetAllMap
   */
  transformerGet?: (string | { field: string, property: string })[] | TransformGetFn | boolean;
  /**
   * (Opcional) Indica se deve remover o campo utilizado como chave da busca do resultado a ser retornado
   */
  removeFieldId?: boolean;
  /**
   * (Opcional) Indica se deve mesclar as propriedades do campo no resultado o qual foi feito o JOIN
   */
  unwrapField?: boolean;
  /**
   * (Opcional) Lista de sub-joins a serem feitos sobre os itens recuperados da coleção origem.
   * @obs Caso seja passado `true` será utilizado a parametrização de JOIN da coleção
   * de origem dos dados, caso a mesma exista.
   * @alias addJoinGetByIdMap
   * @alias addJoinGetAllMap
   */
  joinFields?: IJoinField[] | boolean;
}

export interface IBackendService {

  /**
   * Efetua o processamento da requisição HTTP
   * @param req Requisição HTTP a ser processada
   * @returns Um observable com uma resposta HTTP indicando sucesso ou erro na operação.
   */
  handleRequest(req: IRequestCore<any>): Observable<any>;

  /* set */ backendUtils(value: IBackendUtils): void;

  /**
   * Efetua a criação do banco de dados conforme a necessidade.
   * @return Uma Promisse que devolve um boleano indicando sucesso ou fracasso da operação.
   */
  createDatabase(): Promise<boolean>;

  /**
   * Efetua a exclusão do banco de dados conforme a necessidade.
   * @return Uma Promisse que devolve um boleano indicando sucesso ou fracasso da operação.
   */
  deleteDatabase(): Promise<boolean>;

  /**
   * Efetua a criação das colecões de itens utilizando como nomes as chaves do mapeamento.
   * Quando passado uma instancia de função válida no valor do mapeamento irá disparar
   * esta função para a coleção ao final do processo de criação de todas as coleções.
   */
  createObjectStore(dataServiceFn: Map<string, LoadFn[]>): Promise<boolean>;

  /**
   * Verifica se existe uma coleção com o nome passado no backend
   * @param collectionName - Nome da coleção a qual se deseja verificar a existência
   * @return verdadeiro no caso de existir ou falso quando não existe
   */
  hasCollection(collectionName: string): boolean;

  /**
   * Retorna listagem com os nomes das coleções
   */
  listCollections(): string[];

  /**
   * Grava um registro na coleção retornando o seu respectivo ID
   * @param collectionName - Nome da coleção a qual se deseja adicionar dados
   * @param data - Dado (objeto) que se deseja adicionar a coleção
   * @return Uma Promisse que devolve o id da entidade armazenada.
   */
  storeData(collectionName: string, data: any): Promise<string | number>;

  /**
   * Limpa todos os registro de uma determinada coleção
   * @param collectionName - Nome da coleção a qual se deseja limpar dados
   * @return Uma Promisse que devolve um boleano indicando sucesso ou fracasso da operação.
   */
  clearData(collectionName: string): Promise<boolean>;

  /**
   * Permite adicionar uma função que irá fazer a transformação dos dados
   * quando for acionado o endpoint de listagem dos dados da coleção
   * @param collectionName - Nome da coleção a qual se deseja aplicar a transformação
   * @param transformfn - Função de callback a ser chamada
   */
  addTransformGetAllMap(collectionName: string, transformfn: TransformGetFn): void;

  /**
   * Permite adicionar uma função que irá fazer a transformação dos dados
   * quando for acionado o endpoint que busca um item específico em uma coleção
   * @param collectionName - Nome da coleção a qual se deseja aplicar a transformação
   * @param transformfn - Função de callback a ser chamada
   * @example
   *   const tranformGetById = (item: IDocument) => {
   *     item['customer'] = { id: item.customerId }
   *     delete item.customerId;
   *     return item;
   *   };
   *   service.addTransformGetByIdMap('documents', tranformGetById);
   */
  addTransformGetByIdMap(collectionName: string, transformfn: TransformGetFn): void;

  /**
   * Permite adicionar uma configuração de JOIN automático ao recuperar os itens da coleção
   * via GetAll, injetando os dados nos itens recuperados
   * @param collectionName Nome da coleção a qual se deseja aplicar a configuração de JOIN
   * @param joinField Configuração de JOIN a ser aplicada
   * @example
   *   const joinClient = {
   *     fieldId: 'clientId',
   *     collectionSource: 'clients',
   *     fieldDest: 'client',
   *     transformerGet: ['id', 'name']
   *   };
   *   service.addJoinGetAllMap('documents', joinClient);
   */
  addJoinGetAllMap(collectionName: string, joinField: IJoinField): void;

  /**
   * Permite adicionar uma configuração de JOIN automático ao recuperar o item da coleção
   * via GetById, injetando os dados no item recuperados
   * @param collectionName Nome da coleção a qual se deseja aplicar a configuração de JOIN
   * @param joinField Configuração de JOIN a ser aplicada
   * @example
   *   const joinClient = {
   *     fieldId: 'clientId',
   *     collectionSource: 'clients',
   *   };
   *   service.addJoinGetAllMap('documents', joinClient);
   */
  addJoinGetByIdMap(collectionName: string, joinField: IJoinField): void;

  /**
   * Junção das funções `addJoinGetAllMap` e `addJoinGetByIdMap`.
   * Quando chamado esta função elá ira chamar as duas funções adicionando
   * o JOIN em ambos os endpoints (GetAll e GetById) com a mesma configuração
   * @alias addJoinGetAllMap
   * @alias addJoinGetByIdMap
   */
  addJoinGetBothMap(collectionName: string, joinField: IJoinField): void;

  /**
   * Permite adicionar uma função que irá fazer a transformação dos dados
   * quando for acionado o endpoint que efetua a criação de um item na coleção
   * @param collectionName - Nome da coleção a qual se deseja adicionar função de transformação
   * @param transformfn - Função a ser aplicada sobre o body da requisição
   * @example
   *   const tranformPost = (body: IDocument) => {
   *     body['createdAt'] = new Date();
   *     return body;
   *   }
   *   service.addTransformPostMap('documents', tranformPost);
   */
  addTransformPostMap(collectionName: string, transformfn: TransformPostFn): void;

  /**
   * Permite adicionar uma função que irá fazer a transformação dos dados
   * quando for acionado o endpoint que efetua a alteração de um item na coleção
   * @param collectionName - Nome da coleção a qual se deseja adicionar função de transformação
   * @param transformfn - Função a ser aplicada sobre o body da requisição
   * @example
   *   const tranformPut = (item: IDocument, body: IDocument) => {
   *     body['updatedAt'] = new Date();
   *     return body;
   *   }
   *   service.addTransformPutMap('documents', tranformPut);
   */
  addTransformPutMap(collectionName: string, transformfn: TransformPutFn): void;

  /**
   * Permite adicionar um filtro rápido que será aplicado na busca
   * Ao efetuar uma busca passando na url o termo e valor será aplicado o filtro
   * para o valor informado sobre os campos da lista com condição [OR]
   * @param collectionName - Nome da coleção a qual se deseja adicionar o filtro rápido
   * @param quickFilter - Parâmetros para ser aplicado o filtro rápido (Termo e Campos)
   * @example
   *   // URL => http://myhost/api/produtos?searchTerm=leite
   *   service.addQuickFilterMap('produtos', {term: 'searchTerm', fields: ['codigo', 'descricao']});
   */
  addQuickFilterMap(collectionName: string, quickFilter: IQuickFilter): void;

  /**
   * Permite adicionar uma função que irá aplicar um filtro customizado para um
   * determinado parâmetro da query quando for acionado endpoint de listagem
   * dos dados da coleção
   * @param collectionName - Nome da coleção a qual se deseja adicionar a regra de filtro
   * @param field - Nome do parâmetro enviado na query da URL
   * @param filterfn - Função ou regra de operador a ser aplicada sobre o parâmetro da query
   * @example
   *   // Usando FilterFn
   *   const filterfn = (clientId: string, document: IDocument) => {
   *     return document.client.id == clientId;
   *   }
   *   service.addFieldFilterMap('documents', 'clientId', filterfn);
   *   // Usando operadores (eq)
   *   service.addFieldFilterMap('documents', 'identifier', 'eq');
   */
  addFieldFilterMap(collectionName: string, field: string, filterfn: FilterFn | FilterOp): void;

  /**
   * Permite adicionar uma string, ou uma lista de strings que devem ser substituídas
   * a partir do path da URL acionada.
   * Quando informado nos parâmetros de configuração do serviço o `rootPath` e a `apiBase`
   * a lista passada será considerada a partir deste ponto.
   * @param collectionName - Nome da coleção a qual se deseja adicionar o replace
   * @param replace - String ou array de strings a serem substituidas.
   * @example
   *  // considerando a coleção `produtos` com o endpoint: host.com/api/produto
   *  addReplaceUrl('produtos', 'produto');
   *  . . .
   *  // considerando a coleção `produtos` com o endpoint: host.com/api/service/produto
   *  addReplaceUrl('produtos', 'service/produto');
   *  . . .
   *  addReplaceUrl('produtos', ['service', 'produto']);
   */
  addReplaceUrl(collectionName: string, replace: string | string[]): void;

  /**
   * Permite adicionar um mapeamento de um método POST para outro método
   * Este mapeamento somente será aplicado caso não tenha nenhum interceptor
   * para a requisição.
   * Quando adicionado um mapeamento a coleção este terá prioridade de aplicação sobre
   * as configurações gerais do serviço, não sendo aplicados os mapeamentos gerais.
   * `config.postsToOtherMethod`
   * @param collectionName - Nome da coleção a qual se deseja adicionar o mapeamento de/para
   * @param postToOtherMethod - Configurações do mapeamento de/para do método POST
   * @alias IPostToOtherMethod
   * @example
   *   // URL => http://myhost/api/produtos/123/excluir
   *   service.addPostToOtherMethodMap('produtos', {
   *     otherMethod: 'DELETE',
   *     applyTo: 'urlSegment',
   *     value: 'excluir'
   *   });
   *   // URL => http://myhost/api/produtos/123?action=excluir
   *   service.addPostToOtherMethodMap('produtos', {
   *     otherMethod: 'DELETE',
   *     applyTo: 'queryParam',
   *     param: 'action',
   *     value: 'excluir'
   *   });
   */
  addPostToOtherMethodMap(collectionName: string, postToOtherMethod: IPostToOtherMethod): void;

  /**
   * Permite adicionar um objeto que configura uma regra de interceptação para uma
   * determinada requisição com base no método, url e parâmetros fornecendo uma
   * resposta customizada conforme a necessidade.
   * @param requestInterceptor - Objeto que representa interface de um interceptor
   * @alias IRequestInterceptor
   * @example
   *  // add interceptor to generate a document identifier in backend
   *  // intercept the url: http://myhost.com/api/documents/identifier
   *  dbService.addRequestInterceptor({
   *    method: 'POST',
   *    path: 'identifier',
   *    applyToPath: 'beforeId',
   *    collectionName: 'documents',
   *    response: (utils: IInterceptorUtils) => {
   *      const identifier = Math.floor(Math.random() * (9000000000 - 1000000000)) + 1000000000;
   *      return utils.fn.response(utils.url, 200, {identifier});
   *    }
   *   });
   */
  addRequestInterceptor(requestInterceptor: IRequestInterceptor): void;

  /**
   * Permite adicionar um objeto que configura uma regra de interceptação para uma
   * determinada requisição com base no método, url e parâmetros fornecendo uma
   * resposta customizada conforme a necessidade.
   * Nesta variação a propriedade `response` não aceita intância de função
   * @param value - Objeto que deve conter a estrtura mínima da interface de um interceptor
   * @alias IRequestInterceptor
   * @alias addRequestInterceptor
   */
  addRequestInterceptorByValue(value: any): void;

  /**
   * Permite buscar um item diretamente da coleção. Pode ser utilizado para complementar informações
   * em uma requisição com dados de outra coleção. Quando acionado diretamente via getInstance$
   * o item não será submetido a função de transformação mapeada, caso esta exista.
   * @param collectionName - Nome da coleção a qual se deseja buscar o item
   * @param id - Id do item que deseja ser recuperado
   * @returns Um observable que retorna a intância do item quando completo.
   * @example
   *   // Considerando que foi adicionado um interceptador para o GetById de documentos
   *   const dbService = getBackendService();
   *   const getDocument = (utils: IInterceptorUtils) => {
   *     dbService.get$('documents', utils.id, undefined, utils.url).pipe(
   *       concatMap((document) => dbService.getIntance('customers', document.customerId).pipe(
   *         map((customer) => document['customer'] = customer))
   *       ))
   *   }
   */
  getInstance$(collectionName: string, id: any): Observable<any>;

  /**
   * Permite buscar itens diretamente da coleção através de condições. Pode ser utilizado para complementar informações
   * em uma requisição com dados de outra coleção. Quando acionado diretamente via getAllByFilter$
   * o item não será submetido a função de transformação mapeada, caso esta exista.
   * @param collectionName - Nome da coleção a qual se deseja buscar o item
   * @param conditions - Lista de condições a serem aplicadas para filtar os itens
   * @returns Um observable que retorna a listagem dos itens quando completo.
   */
  getAllByFilter$(collectionName: string, conditions?: Array<IQueryFilter>): Observable<any>;

  /**
   * Permite recuperar um ou mais itens de uma coleção retonando um resposta HTTP.
   * Esta função é acionada pela biblioteca quando feita uma requsição GET padrão,
   * porém, é externalizada para ser utilizada nos interceptors caso necessário.
   * Todas as transformações são aplicadas aos registros retornados (GetById e GetAll).
   * Para registros de consulta é possível retornar os mesmos de forma paginada.
   * Quando passado o `getJoinFields`, estes serão aplicados no lugar das configurações
   * de JOIN padrão da coleção, caso elas existam.
   * @param collectionName Nome da coleação a qual se deseja buscar o/os item/itens
   * @param id Identificador do item que se deseja buscar (GetById)
   * @param query Parâmetros a serem aplicados quando buscar mais de um item da coleção (GetAll)
   * @param url URl a ser utilizada na resposta
   * @param getJoinFields Configuração de JOIN para ser utilizada ao recuperar os itens da coleção
   * @param caseSensitiveSearch Indica se a pesquisa deve ser case sensitive.
   * @returns Um observable que retorna uma resposta HTTP contendo o item ou os itens no corpo da mesma
   */
  get$(
    collectionName: string,
    id: string,
    query: Map<string, string[]>,
    url: string,
    getJoinFields?: IJoinField[],
    caseSensitiveSearch?: string
  ): Observable<any>;

  /**
   * Permite criar ou atualizar um item na coleção
   * Esta função é acionada pela biblioteca quando feita uma requsição POST padrão,
   * porém, é externalizada para ser utilizada nos interceptors caso necessário.
   * Permite atualizar um item quando `config.post409 = false`. Quando atualizado um item
   * através do POST o id do item deve ser o mesmo da URL quando fornecido na mesma
   * @param collectionName Nome da coleação a qual se deseja buscar o/os item/itens
   * @param id Identificador do item que se deseja criar (Opcional)
   * @param item Conteúdo do corpo da requisição HTTP
   * @param url URl a ser utilizada na resposta
   * @returns Um observable que retorna uma resposta HTTP indicando sucesso ou erro na operação
   * @alias BackendConfigArgs
   */
  post$(collectionName: string, id: string, item: any, url: string): Observable<any>;

  /**
   * Permite atualizar ou criar um item na coleção
   * Esta função é acionada pela biblioteca quando feita uma requsição PUT padrão,
   * porém, é externalizada para ser utilizada nos interceptors caso necessário.
   * Permite criar um item quando `config.put404 = false`. Quando criado um item
   * através do PUT o id do item é o mesmo da URL passada
   * @param collectionName Nome da coleação a qual se deseja buscar o/os item/itens
   * @param id Identificador do item que se deseja atualizar
   * @param item Conteúdo do corpo da requisição HTTP
   * @param url URl a ser utilizada na resposta
   * @returns Um observable que retorna uma resposta HTTP indicando sucesso ou erro na operação
   * @alias BackendConfigArgs
   */
  put$(collectionName: string, id: string, item: any, url: string): Observable<any>;

  /**
   * Permite excluir um item de uma determinada coleção.
   * Esta função é acionada pela biblioteca quando feita uma requsição DELETE padrão,
   * porém, é externalizada para ser utilizada nos interceptors caso necessário.
   * @param collectionName Nome da coleação a qual se deseja buscar o/os item/itens
   * @param id Identificador do item que se deseja excluir
   * @param url URl a ser utilizada na resposta
   * @returns Um observable que retorna uma resposta HTTP indicando sucesso ou erro na operação
   */
  delete$(collectionName: string, id: string, url: string): Observable<any>;

}

export interface IBackendUtils {
  createPassThruBackend(): IPassThruBackend;
  createResponseOptions<T>(url: string, status: number, body?: T): IHttpResponse<T>;
  createErrorResponseOptions(url: string, status: number, error?: IErrorMessage | any): IHttpErrorResponse;
}
