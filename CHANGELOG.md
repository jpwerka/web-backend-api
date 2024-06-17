# "web-backend-api" versions

> This web-backend-api exists primarily to support the mock backend in WEB App.
> Allowing the behavior of an HTTP request to be simulated without having another application running.
> It is not supposed to emulate every possible real world web API and is not intended for production use.
>
> Most importantly, it is **_always experimental and only for developer mode_**.

We will make breaking changes and we won't feel bad about it
because this is a development tool, not a production product.
We do try to tell you about such changes in this `CHANGELOG.md`
and we fix bugs as fast as we can.

<a id="7.0.2"></a>

## 7.0.2 (2024-06-16)

- Fix: Ajustado JOIN com campo inexistente

Quando havia uma configuração de JOIN para um campo de coleção, porém a a coleção 
não possuia o campo `fieldId`, estava tentando buscar de forma indevida os dados.\
_Nota: caso exista o campo `field` e `fieldId`, será lançado um WARNING._

<a id="7.0.1"></a>

## 7.0.1 (2024-05-14)

- Fix: Removido dependência do deepclone

Incorporado código da biblioteca deepclone, pois estava dando conflito de importação

<a id="7.0.0"></a>

## 7.0.0 (2024-05-13) (Não publicada)

---

### <span style="color:#f00">⚠</span> BREAKING CHANGES <span style="color:red">⚠</span>

---

- Feat: Removido Angular e RxJs (#55)

Alterado para ser um biblioteca Javascript padrão agnóstica de framework.\
Todos os retornos agora são do tipo Promise\
Somente é possível retornar uma Promise ou um objeto em um interceptor, 
removido suporte a Observable (RxJs)\
Removido as classes que eram exclusivas do framework angular e colocadas 
apenas no projeto de exemplo.\
Alterado para ser usado o webpack padrão para compilação e geração da biblioteca.\
Alterado testes para usar Jest ao invés de Jasmine.\
Atualizado biblioteca do ESLint e atualizado as regras do mesmo.\
Criado arquivo de `CHANGELOG.md`.

Para maiores detalhes de como fazer a migração acesso o arquivo [MIGRATION](./MIGRATION.md)

<a id="6.1.0"></a>

## 6.1.0 (2023-10-23)

- Feat: Alterado retorno da biblioteca para suportar Promise (#54)

Alterado a biblioteca para retornar Promise ao invés de Observable\
Depreciado retorno via Observable, mas mantido como padrão, para manter
compatibilidade.\
Adicionado suporte de retorno como Promise por padrão para todos os métodos
get$, post$, put$ e delete$.\
Para compatibilidade será mantido nesta versão o retorno como Observable, porém,
caso seja passado false no último parametro o retorno já será uma Promise\
Alterado para quando for despachado para o servidor real utilizar a api
`fetch` ao invés da api `XMLHttpRequest`\
Alterado para compatibilidade com angular da versão 13 até a 17.

## 6.0.0 (2023-08-26) - Não publicado

- Feat: Separate sample from library (#53)

* chore: Removido pastas do projeto de exemplo
* Fix: Ajustes comandos compilação
* Fix: Corrigido configurações de testes
* Fix: Ajustes diretório coverage
* chore: Replace README file

<a id="6.0.0"></a>

## 6.0.0 (2023-06-23)

- Atualização para Angular 15

<a id="5.0.0"></a>

## 5.0.0 (2022-12-17)

- Atualização para Angular 14

<a id="4.3.3"></a>

## 4.3.3 (2022-12-17)

- Feat: Criado serviço de LOG com níveis

Criado a opção de colocar níveis de LOG `LoggerLevel` dos tipos:
ERROR, WARN, INFO, DEBUG, TRACE

<a id="4.3.0"></a>

## 4.3.0 (2022-08-03)

- Feat: Inclusão de interceptors default para todas as coleções e count$

Foi adicionada a propriedade `defaultInterceptors` nas configurações iniciais
permitindo desta forma configurar um interceptor padrão para todas as coleções.\
Foi adicionado o método `count$` que permite retornar a quantidade de registros
total de uma coleção.

<a id="4.2.1"></a>

## 4.2.1 (2022-08-02)

- Fix: Correção da pesquisa e ordenação implementando case sensitive para strings

Foram ajustados todos os pontos onde são aplicados filtros e ordenação para
aplicar corretamente a configuração de case sensitive.\
Foi ajustado o método `get$` para receber no último parâmetro o indicador de
`caseSensitiveSearch` via boolean conforme a parametrização inicial do backend.

<a id="4.2.0"></a>

## 4.2.0 (2022-07-28)

- Feat: Suporte a função de comparação customizada

Adicionado o método `addFieldCompareMap` que permite adicionar uma função de
comparação customizada para um determinado campo quando ele for ordenado.

<a id="4.1.0"></a>

## 4.1.0 (2022-07-28)

- Feat: Suporte a order na query de consulta

Implementado o suporte ao campo order do query param.\
Permite ordenação ASC e DESC. Exemplo: http://host/api/colection?order=field1,-filed2\
Somente suporte a ordenação de primeiro nível no objeto da coleção.

<a id="4.0.2"></a>

## 4.0.2 (2022-07-17)

- Fix: Import style (#40)

Ajustado import da lib `json.date-extensions`\
Chore: rxjs 7.4

<a id="4.0.0"></a>

## 4.0.0 (2022-07-17)

- Migração para Angular 13

<a id="3.3.0"></a>

## 3.3.0 (2022-07-05)

- Feat: Criado serviço para uso em testes

Criado o serviço `HttpClientTestingBackendService` e o módulo
`WebBackendApiTestingModule` para serem utilizados como MOCK em cenários de testes.\
Criado um entry point separado somente para o serviço de backend sem ter
dependências do angular.

<a id="3.2.1"></a>

## 3.2.1 (2022-06-23)

- Fix: Corrigido contrato interface backend

Adicionando o método `removeRequestInterceptor` no contrato da interface `IBackendService`

<a id="3.2.0"></a>

## 3.2.0 (2022-06-23)

- Feat: Replace and delete interceptor response

Incluído a opção para poder fazer o replace de um interceptor. Passando um
interceptor com os mesmos dados (method, path, collection, applyTo, query),
será substituído e retornando a instância do interceptor existente. No caso
de query, sḿente serão considerados se os `params` forem iguais,
desconsiderando os `values`

---

### <span style="color:#f00">⚠</span> BREAKING CHANGES <span style="color:red">⚠</span>

---

- O método `getInstance$` passou a retornar uma `Promise` ao invés de um `Observable`

<a id="3.1.3"></a>

## 3.1.3 (2022-06-09)

- Fix: Removido dependência do lodash-es

Esta dependência causava conflito com configuração do JEST

<a id="3.1.2"></a>

## 3.1.2 (2022-04-13)

- Fix: Atualização de vunerabilidades

Atualizado biblioteca no UUID\
Atualizado biblioteca do lodash

<a id="3.1.1"></a>

## 3.1.1 (2021-08-01)

- Fix: Criação de testes e correções de bugs encontrados ao criar os testes

Migrado para ESLint.\
Ativado regras recomendadas do ESlint.\
Criado cenários de testes para ambas as configurações da biblioteca (memory e indexed).\
Ajustado todos os pontos onde as novas regras do ESLint estavam acusando problemas.\
Corrigido todos os pontos onde foram identificados problemas ao criar os testes.

- README - Opção de configuração via enviroment

Criado documentação de como importar a biblioteca utilizando a opção de configuração através de variáveis de ambiente.

<a id="3.1.0"></a>

## 3.1.0 (2021-07-10)

- Feat: Filtro multi-nível e JOIN customizado

Incluído a possibilidade de aplicar filtros multi-nível. Exemplo: child.property=value\
Incluído o parâmetro para permitir passar o JOIN fields customizado num get$.
Neste caso será utilizado o JOIN passado no GET ao invés dos configurados
para a coleção. Mas ainda será possível utilizar os JOINs das subcoleções.\
Incluído no JOIN a possibilidade de fazer o unwrap dos atributos retornados,
ou seja, ao invés de retornar { entity.child.properties } retornar { entity.childProperties }
Incluído no tranformerGet a possibilidade de renomear um campo ao retornar o
mesmo, bastando para isso passar { field: string, property: string } ao invés do nome simples.

<a id="2.1.0"></a>

## 2.1.0 (2021-07-10)

- Feat: Filtro multi-nível e JOIN customizado

Incluído a possibilidade de aplicar filtros multi-nível. Exemplo: child.property=value\
Incluído o parâmetro para permitir passar o JOIN fields customizado num get$.
Neste caso será utilizado o JOIN passado no GET ao invés dos configurados
para a coleção. Mas ainda será possível utilizar os JOINs das subcoleções.\
Incluído no JOIN a possibilidade de fazer o unwrap dos atributos retornados,
ou seja, ao invés de retornar { entity.child.properties } retornar { entity.childProperties }
Incluído no tranformerGet a possibilidade de renomear um campo ao retornar o
mesmo, bastando para isso passar { field: string, property: string } ao invés do nome simples.

<a id="3.0.1"></a>

## 3.0.1 (2021-07-08)

- Fix: Ajuste para JOIN multiplos níveis

Ajustado para permtir JOIN de forma recursiva.

<a id="2.0.1"></a>

## 2.0.1 (2021-07-08)

- Fix: Resposta de erro com NOT_FOUND (#24)

Alterado para quando a entidade não for encontrada numa requisição de GET por
ID, retornar uma resposta de erro.

- Fix: Ajuste para JOIN multiplos níveis

Ajustado para permtir JOIN de forma recursiva.

<a id="3.0.0"></a>

## 3.0.0 (2021-06-17)

- Migração para Angular 12

- Fix: Resposta de erro com NOT_FOUND (#24)

Alterado para quando a entidade não for encontrada numa requisição de GET por
ID, retornar uma resposta de erro.

<a id="2.0.0"></a>

## 2.0.0 (2021-04-22)

- Migração para Angular 11

<a id="1.0.3"></a>

## 1.0.3 (2020-12-11)

- Fix: JOIN com objetos compostos

Ajustado o retorno quando o JOIN era feito com um nó do objeto principal.\
Exemplo: Ao fazer JOIN com `entity.property.subEntityId` estava retornando
`entity.subEntity`, sendo que o correto era retornar `entity.property.subEntity`.

<a id="1.0.1"></a>

## 1.0.1 (2020-08-15)

- Feat: Adicionado configuração para parser de data no JSON

Adicionado uma propriedade na configuração para permitir transformar o retorno
de strings de data em objeto Date.\
Utilizado para isto a biblioteca: https://github.com/RickStrahl/json.date-extensions

<a id="1.0.0"></a>

## 1.0.0 (2020-08-11)

- Migração para Angular 10

<a id="0.0.25"></a>

## 0.0.25 (2020-08-06)

- Fix: Correção nas configurações de memória

Não estava carregando as configurações do backend quando executado com
configuração em memória.

<a id="0.0.24"></a>

## 0.0.24 (2020-08-06)

- Feat: Permitir uma mesma coleção ter dois arquivos de mapeamento.

Incluído a possibilidade de para uma mesma coleção ter dois arquivos
`.data.ts`, ambos com regras distintas de configuração. Desta forma podem ser
segregadas responsabilidades de coleções que interagem com dois ou mais processos.

<a id="0.0.23"></a>

## 0.0.23 (2020-08-01)

- Fix: Ordenação dos dados utilizando banco em Memória vs IndexedDB (#11)

Alterado para fazer inserção ordenada no array em memória pelo id, tendo desta
forma o mesmo comportamento do IndexDB.

<a id="0.0.22"></a>

## 0.0.22 (2020-07-30)

- Fix: TransactionInactiveError no POST ou PUT

Ajustado para quando chamar o método `IDBObjectStore.add` ou
`IDBObjectStore.put` sempre forçar abrir uma nova transação.\
Ocorria problema se ao aplicar as transformações antes do método post$ ou put$
fosse acessado o banco para complementar informações da coleção a ser
persistida com dados de outras coleções.

<a id="0.0.21"></a>

## 0.0.21 (2020-07-01)

- Feat: Criação de log e utilitário de filtro

Criado nas configurações a possibilidade de efetuar log das requisições
e respostas do backend.\
Criado a função utilitária `conditions` que vem junto com o parâmetro
`utils.fn` para ser utilizados nos interceptor, facilitando a criação
de filtros a serem aplicados ao método `getAllByFilter$`

<a id="0.0.20"></a>

## 0.0.20 (2020-06-18)

- Fix: Ajuste para carga das configurações iniciais

Alterado para fazer a cópia das configurações avaliando se a propriedade
existe e não apenas se a propriedade é válida, pois desta forma não estava
copiando propriedades falsas.

<a id="0.0.19"></a>

## 0.0.19 (2020-06-02)

- Fix: Ajustes no PUT para objeto sem ID

Alterado para quando for feito um PUT e não estiver configurado para fazer
append dos atributos com o objeto já existente (`config.appendPut=false`),
caso não exista o ID no body passado, injetar corretamente o ID da URL
como o id do item da coleção.

<a id="0.0.18"></a>

## 0.0.18 (2020-03-31)

- Fix: Ajustes no JOIN e Transformer de uma sub coleção

Alterar para buscar os JOINS e função de transformação de sub-coleções
apenas quando o banco for sinalizado como pronto.\
Alterado para primeiro fazer o JOIN de uma sub coleção para
depois aplicar a função de transformação.\
Ajustes na documentação de JOIN.

<a id="0.0.15"></a>

## 0.0.15 (2020-03-31)

- Fix: Ajustes na função de setup do backend

Alterado para notificar como pronto um banco de dados sem nenhuma coleção.

<a id="0.0.14"></a>

## 0.0.14 (2020-03-16)

- Fix: Correção JOIN array com valores undefined

Aplicado tratamento para valores undefined quando for aplicar as
tranformações de GET e JOIN sobre um array de possíveis instâncias.

<a id="0.0.13"></a>

## 0.0.13 (2020-03-10)

- Feat: Adicionado suporte para JOIN de array e multinivel

Adicionado suporte para JOIN de campos do tipo array de ids.\
Adicionado suporte para reutilizar função de transformação de GetById
da coleção de origem ao fazer JOIN.\
Adicionado possibilidade de remover o campo id utilizado no JOIN.\
Adicionado a possibilidade de fazer JOIN com proprieades de itens que
sejam objetos, estejam eles num array ou sejam simples objetos.\
Possibilidade de encadear os JOINs para a coleção ou parametrizar um sub-join
para as proprieades.

<a id="0.0.12"></a>

## 0.0.12 (2020-01-26)

- Feat: Incluído serviço de download e documentação

Incluído componente de download e alterado serviço de download para permitir
efetuar o download em typescript.\
Incluído documentação das interfaces dos interceptors.\
Alterado README da biblioteca incluindo mais detalhes.

<a id="0.0.11"></a>

## 0.0.11 (2020-01-22)

- Fix: Indexdb com ID inválido e ajustes JOIN

Corrigido serviço de backend quando utilizado indexdb e id como autoincremento,
quando era passado um valor inválido para o id.\
Corrigido retornos de POST e PUT para indexdb aplicando JOIN e Transformer
quando retorna entidade.

<a id="0.0.10"></a>

## 0.0.10 (2020-01-21)

- Fix: Correção na montagem dos filtros

Adicionado condição para ignorar a palavra `expand` da query string.

<a id="0.0.9"></a>

## 0.0.9 (2020-01-21)

- Fix: Alterado parser de interceptors

Alterado para permitir adicionar interceptors para um path vazio para as
coleções tanto no beforeId quanto no afterId.

<a id="0.0.8"></a>

## 0.0.8 (2020-01-20)

- Fix: Ajustes para respostas de GetAll

Alterado a forma que aplica as transformações de join e function quando
acionado a GET para busca de itens com filtros.\
Estava ocorrendo erro de transação quando utilizado indexdb como repositório
quando existiam muitos processamentos em paralelo.

<a id="0.0.7"></a>

## 0.0.7 (2020-01-20)

- Fix: Ajustes de busca por query

Ajustado a busca por query para ser assincrona da mesma forma que o GetAll.

<a id="0.0.6"></a>

## 0.0.6 (2020-01-17)

- Fix: Ajuste de paginação para memória

Quando o tipo do banco era apenas em memória e era passado o
parâmetro `pageSize` não estava respeitando o mesmo.

<a id="0.0.5"></a>

## 0.0.5 (2020-01-16)

- Fix: Ajustes no parser do ID

Ajustado para quando utilizar id com auto incremento e receber
string no body[id] efetuar um parseInt neste valor.

<a id="0.0.4"></a>

## 0.0.4 (2020-01-13)

- Feat: Incluído documetação e README

<a id="0.0.3"></a>

## 0.0.3 (2020-01-12)

- Feat: Incluído JOIN e Download

Incluído possibilidade de mapear campos para fazer JOIN com outras
coleções permitindo injetar estes atributos no resultado do GET.\
Incluído um serviço que permite fazer o download dos dados de
uma coleção no formato JSON.

<a id="0.0.2"></a>

## 0.0.2 (2020-01-10)

- Fix: Ajuste na aplicação de filtro.

<a id="0.0.1"></a>

## 0.0.1 (2020-01-09)

- Commit inicial
