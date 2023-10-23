import { Observable, firstValueFrom } from 'rxjs';
import { IBackendUtils, IJoinField, LoadFn, TransformGetFn, TransformPostFn, TransformPutFn } from '../interfaces/backend.interface';
import { BackendConfigArgs } from '../interfaces/configuration.interface';
import { ConditionsFn, ErrorResponseFn, IConditionsParam, IDefaultInterceptor, IErrorMessage, IHttpErrorResponse, IHttpResponse, IInterceptorUtils, IPassThruBackend, IPostToOtherMethod, IRequestCore, IRequestInterceptor, ResponseFn } from '../interfaces/interceptor.interface';
import { CaseSensitive, CompareFn, FieldFn, FilterFn, FilterOp, IQueryCursor, IQueryFilter, IQueryOrder, IQueryParams, IQueryResult, IQuickFilter } from '../interfaces/query.interface';
import { IParsedRequestUrl, IUriInfo } from '../interfaces/url.interface';
import { delayResponse } from '../utils/delay-response';
import { STATUS } from '../utils/http-status-codes';
import { parseUri } from '../utils/parse-uri';

import deepClone from 'clonedeep';
import 'json.date-extensions';
import { Logger, LoggerLevel } from '../utils/logger';

export type IExtendEntity = { [key: string]: unknown } & { id?: string | number }

interface IRequestInfo {
  req: IRequestCore<IExtendEntity>;
  method: string;
  url: string;
  apiBase: string;
  collectionName: string;
  id: string;
  query: Map<string, string[]>;
  extras?: string;
  resourceUrl: string;
  body?: IExtendEntity;
  interceptor?: IRequestInterceptor;
  interceptorIds?: string[];
}

interface IInterceptorInfo {
  interceptor?: IRequestInterceptor;
  interceptorIds?: string[];
}

export function removeRightSlash(path: string): string {
  return path.replace(/\/$/, '');
}

export function removeLeftSlash(path: string): string {
  return path.replace(/^\//, '');
}

export function paramParser(rawParams: string): Map<string, string[]> {
  const mapParam = new Map<string, string[]>();
  if (rawParams.length > 0) {
    const params: string[] = rawParams.split('&');
    params.forEach((param: string) => {
      const eqIdx = param.indexOf('=');
      const [key, val]: string[] = eqIdx === -1 ?
        [decodeURI(param), ''] :
        [decodeURI(param.slice(0, eqIdx)), decodeURI(param.slice(eqIdx + 1))];
      const list = mapParam.get(key) || [];
      list.push(val);
      mapParam.set(key, list);
    });
  }
  return mapParam;
}

export const LOG: Logger = new Logger();
export const cssBIB = 'font-style: italic; font-weight: bold; color: brown';
export const cssBIG = 'font-style: italic; font-weight: bold; color: darkgreen';
export abstract class BackendService {

  protected loadsFn: Array<LoadFn> = [];
  protected replaceMap = new Map<string, Array<string[]>>();
  protected postToOtherMethodMap = new Map<string, IPostToOtherMethod[]>();
  protected transformGetAllMap = new Map<string, TransformGetFn>();
  protected transformGetByIdMap = new Map<string, TransformGetFn>();
  protected joinnersGetAllMap = new Map<string, IJoinField[]>();
  protected joinnersGetByIdMap = new Map<string, IJoinField[]>();
  protected transformPostMap = new Map<string, TransformPostFn>();
  protected transformPutMap = new Map<string, TransformPutFn>();
  protected fieldsFilterMap = new Map<string, Map<string, FilterFn | FilterOp>>();
  protected fieldsCompareMap = new Map<string, Map<string, CompareFn>>();
  protected quickFilterMap = new Map<string, IQuickFilter>();

  private requestInterceptors: Array<IRequestInterceptor> = [];

  protected dbReadyFn: (value: boolean) => void;
  protected dbReadyPromise: Promise<boolean>;
  private passThruBackend: IPassThruBackend;
  protected config: BackendConfigArgs = {};

  protected utils: IBackendUtils;

  constructor(
    config: BackendConfigArgs = {}
  ) {
    for (const prop in config) {
      if (config.hasOwnProperty(prop)) {
        this.config[prop] = config[prop] as unknown;
      }
    }
    const loc = this.getLocation('/');
    this.config.host = this.config.host ? this.config.host : loc.host;     // default to app web server host
    this.config.rootPath = this.config.rootPath ? this.config.rootPath : loc.path; // default to path when app is served (e.g.'/')
    this.dbReadyPromise = new Promise<boolean>((resolve) => this.dbReadyFn = resolve);
    this.onDbReadyAjustJoinFields();
    if (typeof this.config.log === 'boolean') {
      LOG.level = this.config.log ? LoggerLevel.TRACE : LoggerLevel.ERROR;
    } else {
      LOG.level = this.config.log;
    }
  }

  private async onDbReadyAjustJoinFields() {
    const value = await this.dbReadyPromise;
    if (value) {
      this.adjustJoinFields();
    }
  }

  backendUtils(value: IBackendUtils): void {
    this.utils = value;
  }

  addTransformGetAllMap(collectionName: string, transformfn: TransformGetFn): void {
    this.transformGetAllMap.set(collectionName, transformfn);
  }

  addTransformGetByIdMap(collectionName: string, transformfn: TransformGetFn): void {
    this.transformGetByIdMap.set(collectionName, transformfn);
  }

  clearTransformGetBothMap(collectionName: string): void {
    this.transformGetAllMap.delete(collectionName);
    this.transformGetByIdMap.delete(collectionName);
  }

  addJoinGetAllMap(collectionName: string, joinField: IJoinField): void {
    if (joinField.transformerGet instanceof Array) {
      joinField.transformerGet = this.createJoinTransformGetFn(joinField.transformerGet);
    }
    const joinGetAllMap = this.joinnersGetAllMap.get(collectionName);
    if (joinGetAllMap !== undefined) {
      joinGetAllMap.push(joinField);
    } else {
      this.joinnersGetAllMap.set(collectionName, [joinField]);
    }
  }

  addJoinGetByIdMap(collectionName: string, joinField: IJoinField): void {
    if (joinField.transformerGet instanceof Array) {
      joinField.transformerGet = this.createJoinTransformGetFn(joinField.transformerGet);
    }
    const joinGetByIdMap = this.joinnersGetByIdMap.get(collectionName);
    if (joinGetByIdMap !== undefined) {
      joinGetByIdMap.push(joinField);
    } else {
      this.joinnersGetByIdMap.set(collectionName, [joinField]);
    }
  }

  addJoinGetBothMap(collectionName: string, joinField: IJoinField): void {
    if (joinField.transformerGet instanceof Array) {
      joinField.transformerGet = this.createJoinTransformGetFn(joinField.transformerGet);
    }
    this.addJoinGetAllMap(collectionName, joinField);
    this.addJoinGetByIdMap(collectionName, joinField);
  }

  clearJoinGetBothMap(collectionName: string): void {
    this.joinnersGetByIdMap.delete(collectionName);
    this.joinnersGetAllMap.delete(collectionName);
  }

  addTransformPostMap(collectionName: string, transformfn: TransformPostFn): void {
    this.transformPostMap.set(collectionName, transformfn);
  }

  clearTransformPostMap(collectionName: string): void {
    this.transformPostMap.delete(collectionName);
  }

  addTransformPutMap(collectionName: string, transformfn: TransformPutFn): void {
    this.transformPutMap.set(collectionName, transformfn);
  }

  clearTransformPutMap(collectionName: string): void {
    this.transformPutMap.delete(collectionName);
  }

  addQuickFilterMap(collectionName: string, quickFilter: IQuickFilter): void {
    this.quickFilterMap.set(collectionName, quickFilter);
  }

  clearQuickFilterMap(collectionName: string): void {
    this.quickFilterMap.delete(collectionName);
  }

  addFieldFilterMap(collectionName: string, field: string, filterfn: FilterFn | FilterOp): void {
    let fieldsFilterMap = this.fieldsFilterMap.get(collectionName);
    if (fieldsFilterMap !== undefined) {
      fieldsFilterMap.set(field, filterfn);
    } else {
      fieldsFilterMap = new Map<string, FilterFn | FilterOp>();
      fieldsFilterMap.set(field, filterfn);
      this.fieldsFilterMap.set(collectionName, fieldsFilterMap);
    }
  }

  clearFieldFilterMap(collectionName: string): void {
    this.fieldsFilterMap.delete(collectionName);
  }

  addFieldCompareMap(collectionName: string, field: string, compareFn: CompareFn): void {
    let fieldsCompareMap = this.fieldsCompareMap.get(collectionName);
    if (fieldsCompareMap !== undefined) {
      fieldsCompareMap.set(field, compareFn);
    } else {
      fieldsCompareMap = new Map<string, CompareFn>();
      fieldsCompareMap.set(field, compareFn);
      this.fieldsCompareMap.set(collectionName, fieldsCompareMap);
    }
  }

  clearFieldCompareMap(collectionName: string): void {
    this.fieldsCompareMap.delete(collectionName);
  }

  addReplaceUrl(collectionName: string, replace: string | string[]): void {
    let replaceAdd = [];
    if (typeof replace === 'string') {
      replaceAdd = replace.split('/').filter(value => value.trim().length > 0);
    } else {
      replaceAdd = replace;
    }
    const replaces = this.replaceMap.get(collectionName);
    if (replaces !== undefined) {
      replaces.push(replaceAdd);
    } else {
      this.replaceMap.set(collectionName, [replaceAdd]);
    }
  }

  clearReplaceUrl(collectionName: string): void {
    this.replaceMap.delete(collectionName);
  }

  addPostToOtherMethodMap(collectionName: string, postToOtherMethod: IPostToOtherMethod): void {
    const postsToOtherMethod = this.postToOtherMethodMap.get(collectionName);
    if (postsToOtherMethod !== undefined) {
      postsToOtherMethod.push(postToOtherMethod);
    } else {
      this.postToOtherMethodMap.set(collectionName, [postToOtherMethod]);
    }
  }

  addRequestInterceptor(requestInterceptor: IRequestInterceptor): IRequestInterceptor | null {

    this.adjustInterceptor(requestInterceptor);

    const index = this.requestInterceptors.findIndex((item) => this.isEqualsInterceptor(requestInterceptor, item));
    if (index >= 0) {
      LOG.debug('Replace existing interceptor. (Existing Interceptor)',
        this.requestInterceptors[index], '(New interceptor)', requestInterceptor);
      return this.requestInterceptors.splice(index, 1, requestInterceptor)[0];
    } else {
      LOG.debug('Add new interceptor. (New interceptor)', requestInterceptor);
      this.requestInterceptors.push(requestInterceptor);
      return null;
    }
  }

  removeRequestInterceptor(requestInterceptor: IRequestInterceptor): IRequestInterceptor | null {

    this.adjustInterceptor(requestInterceptor);

    const index = this.requestInterceptors.findIndex((item) => this.isEqualsInterceptor(requestInterceptor, item));
    if (index >= 0) {
      return this.requestInterceptors.splice(index, 1)[0];
    } else {
      return null;
    }
  }

  private adjustInterceptor(requestInterceptor: IRequestInterceptor): void {

    if (!requestInterceptor.method) {
      requestInterceptor['method'] = 'GET';
    }
    if (!requestInterceptor.applyToPath) {
      requestInterceptor['applyToPath'] = 'complete';
    }
    if (requestInterceptor.applyToPath !== 'complete' && !requestInterceptor.collectionName) {
      throw new Error('For no complete interceptor paths, must be informed collectionName in interceptor.');
    }
    if (requestInterceptor.query) {
      let params: Map<string, string[]>;
      const query = requestInterceptor.query;
      if (typeof query === 'string') {
        params = paramParser(query);
      } else if (query instanceof Map) {
        params = new Map(deepClone(Array.from(query)));
      } else {
        params = new Map(deepClone(Array.from(Object.keys(query).map(key => [key, [query[key]]]))));
      }
      if (params && params.size > 0) {
        requestInterceptor['query'] = params;
      } else {
        delete requestInterceptor.query;
      }
    }
  }

  private isEqualsInterceptor(source: IRequestInterceptor, dest: IRequestInterceptor): boolean {
    let ret = true;
    ret = source.method.toLocaleLowerCase() === dest.method.toLocaleLowerCase();
    ret = ret && source.path === dest.path;
    ret = ret && source.applyToPath === dest.applyToPath;
    if (source.applyToPath !== 'complete') {
      ret = ret && source.collectionName === dest.collectionName;
    }
    ret = ret && (!source.query && !dest.query);
    if (ret && source.query && !dest.query) {
      ret = false;
    }
    if (ret && !source.query && dest.query) {
      ret = false;
    }
    if (ret && source.query && dest.query) {
      const keys = (source.query as Map<string, string[]>).keys();
      const destQuery = (dest.query as Map<string, string[]>);
      for (const key of keys) {
        ret = destQuery.has(key);
        if (!ret)
          break;
      }
    }
    return ret;
  }

  addRequestInterceptorByValue(value: IRequestInterceptor | unknown): void {
    let obj: IRequestInterceptor;
    let response: IHttpResponse<unknown>;
    if (typeof value === 'string') {
      try {
        obj = JSON.parse(value) as IRequestInterceptor;
      } catch (error: unknown) {
        const msg = 'O valor informado não é possível de ser interpretado como uma interface IRequestInterceptor;' +
          ` Original error: ${(error as Error).message}`;
        throw new Error(msg);
      }
    } else {
      obj = value as IRequestInterceptor;
    }
    if (obj && obj.path && typeof obj.path === 'string' && obj.response) {
      const path = '/' + obj.path.replace(/^\//, '');
      const url = window.location.origin + path;
      const httpResponse = obj.response as ({ status?: number, statusCode?: number, body?: unknown, error?: unknown });
      const status = (httpResponse.status && typeof httpResponse.status === 'number') ? httpResponse.status :
        (httpResponse.statusCode && typeof httpResponse.statusCode === 'number') ? httpResponse.statusCode :
          (httpResponse.error) ? STATUS.BAD_REQUEST : (httpResponse.body ? STATUS.OK : STATUS.NO_CONTENT);
      if (httpResponse.error) {
        response = this.utils.createErrorResponseOptions(url, status, httpResponse.error);
      } else {
        response = this.utils.createResponseOptions(url, status, (httpResponse.body) ? httpResponse.body : obj.response);
      }
    } else {
      throw new Error('O valor informado não é possível de ser interpretado como uma interface IRequestInterceptor');
    }

    const requestInterceptor: IRequestInterceptor = {
      method: obj.method ? obj.method : 'GET',
      path: obj.path,
      response,
      collectionName: obj.collectionName ? obj.collectionName : undefined,
      applyToPath: obj.applyToPath ? obj.applyToPath : 'complete'
    };
    if (requestInterceptor.applyToPath !== 'complete' && !requestInterceptor.collectionName) {
      throw new Error('For no complete interceptor paths, must be informed collectionName in interceptor.');
    }

    let params: Map<string, string[]>;
    const query = obj.query ? obj.query :
      (obj['queryStringParameters'] ? obj['queryStringParameters'] as string : undefined);
    if (query) {
      if (typeof query === 'string') {
        params = paramParser(query);
      } else if (query instanceof Map) {
        params = new Map(deepClone(Array.from(query)));
      } else {
        params = new Map(deepClone(Array.from(Object.keys(query).map(key => [key, [query[key]]]))));
      }
      if (params && params.size > 0) {
        requestInterceptor['query'] = params;
      }
    }

    this.requestInterceptors.push(requestInterceptor);
  }

  private adjustJoinFieldsGetAll(joinFields: IJoinField[]) {
    joinFields.forEach((joinField: IJoinField) => {
      if (joinField.joinFields && typeof joinField.joinFields === 'boolean') {
        joinField.joinFields = this.joinnersGetAllMap.get(joinField.collectionSource);
      }
      if (joinField.transformerGet && typeof joinField.transformerGet === 'boolean') {
        joinField.transformerGet = this.transformGetAllMap.get(joinField.collectionSource);
      } else if (Array.isArray(joinField.transformerGet)) {
        joinField.transformerGet = this.createJoinTransformGetFn(joinField.transformerGet);
      }
      if (Array.isArray(joinField.joinFields)) {
        this.adjustJoinFieldsGetAll(joinField.joinFields);
      }
    });
  }

  private adjustJoinFieldsGetById(joinFields: IJoinField[]) {
    joinFields.forEach((joinField: IJoinField) => {
      if (joinField.joinFields && typeof joinField.joinFields === 'boolean') {
        joinField.joinFields = this.joinnersGetByIdMap.get(joinField.collectionSource);
      }
      if (joinField.transformerGet && typeof joinField.transformerGet === 'boolean') {
        joinField.transformerGet = this.transformGetByIdMap.get(joinField.collectionSource);
      } else if (Array.isArray(joinField.transformerGet)) {
        joinField.transformerGet = this.createJoinTransformGetFn(joinField.transformerGet);
      }
      if (Array.isArray(joinField.joinFields)) {
        this.adjustJoinFieldsGetById(joinField.joinFields);
      }
    });
  }

  adjustJoinFields(): void {
    this.joinnersGetAllMap.forEach((joinFields: IJoinField[]) => {
      this.adjustJoinFieldsGetAll(joinFields);
    });
    this.joinnersGetByIdMap.forEach((joinFields: IJoinField[]) => {
      this.adjustJoinFieldsGetById(joinFields);
    });
  }

  protected logRequest(request: IRequestCore<IExtendEntity>): void {
    LOG.info(request);
  }

  protected logResponse(response: IHttpResponse<unknown> | IHttpErrorResponse): void {
    LOG.info(response);
  }

  protected convertResponse(response: IHttpResponse<unknown>): IHttpResponse<unknown> {
    if (this.config.jsonParseWithDate && response) {
      const contentType = response.headers ? response.headers.get('Content-Type') : undefined;
      const body = response.body;
      if (contentType === 'application/json' && body) {
        response.body = JSON.parse(JSON.stringify(body), JSON['dateParser']);
        LOG.trace('Body has parsed to convert possibles dates to Date Object. (Body)', response.body);
      }
    }
    return response;
  }

  async handleRequest<T>(req: IRequestCore<unknown>): Promise<IHttpResponse<T>>;
  async handleRequest(req: IRequestCore<IExtendEntity>): Promise<IHttpResponse<unknown>> {

    await this.dbReadyPromise;
    this.logRequest(req);

    let response: IHttpResponse<unknown>;
    try {
      response = await this.handleRequest_(req);
      this.logResponse(response);
      response = this.convertResponse(response);
    } catch (error) {
      this.logResponse(error);
      throw error;
    }

    return response;
  }

  private handleRequest_(req: IRequestCore<IExtendEntity>): Promise<IHttpResponse<unknown>> {

    const url = req.urlWithParams ? req.urlWithParams : req.url;
    let method = req.method || 'GET';

    const intInfo: IInterceptorInfo = {};

    const parsed: IParsedRequestUrl = this.parseRequestUrl(method, url, intInfo);
    let response$: Promise<IHttpResponse<unknown>>;

    if (intInfo.interceptor && intInfo.interceptor.applyToPath === 'complete') {
      const intUtils = this.createInterceptorUtils(url, undefined, intInfo.interceptorIds, parsed.query, req.body);
      response$ = this.processInterceptResponse(intInfo.interceptor, intUtils);
      if (response$) {
        return response$;
      } else if (this.config.passThruUnknownUrl) {
        LOG.debug('Has one complete interceptor, but it does not has a valid response and dispatch request to real backend server.');
        return this.getPassThruBackend().handle(req);
      } else {
        const error: IErrorMessage = {
          message: `Interceptor path '${intInfo.interceptor.path}' does not return a valid response.`,
          detailedMessage: 'Implement a valid response or configure service to dispatch to real backend. (config.passThruUnknownUrl)'
        };
        LOG.error('Has one complete interceptor, but it does not has a valid response.', error);
        return Promise.reject(this.utils.createErrorResponseOptions(url, STATUS.NOT_IMPLEMENTED, error));
      }
    }

    if (method.toUpperCase() === 'POST') {
      method = this.getPostToOtherMethod(parsed.collectionName, parsed.extras, parsed.query, req.body);
    }

    const reqInfo: IRequestInfo = {
      req,
      method,
      url,
      apiBase: parsed.apiBase,
      collectionName: parsed.collectionName,
      id: parsed.id,
      query: parsed.query,
      extras: parsed.extras,
      resourceUrl: parsed.resourceUrl,
      body: req.body,
      interceptor: intInfo.interceptor,
      interceptorIds: intInfo.interceptorIds
    };

    if (this.hasCollection(parsed.collectionName)) {
      return this.collectionHandler(reqInfo);
    } else if (this.config.passThruUnknownUrl) {
      LOG.debug('Has no collection in database, then dispatch request to real backend server');
      // Caso não tenha a collection, repassa a requisição para o backend verdadeiro
      return this.getPassThruBackend().handle(req);
    } else {
      const error: IErrorMessage = {
        message: `Collection '${parsed.collectionName}' not found`,
        detailedMessage: 'Implement interceptor to complete path or configure ' +
          'service to dispatch to real backend. (config.passThruUnknownUrl)'
      };
      const message = 'Has no collection in database, and not dispatch request to real backend server';
      LOG.error(message, error)
      return Promise.reject(this.utils.createErrorResponseOptions(url, STATUS.NOT_FOUND, error));
    }
  }

  abstract hasCollection(collectionName: string): boolean;

  private collectionHandler(reqInfo: IRequestInfo): Promise<IHttpResponse<unknown>> {
    let response$: Promise<IHttpResponse<unknown>>;
    switch (reqInfo.method.toLocaleLowerCase()) {
      case 'get':
        response$ = this.get(reqInfo);
        break;
      case 'post':
        response$ = this.post(reqInfo);
        break;
      case 'put':
        response$ = this.put(reqInfo);
        break;
      case 'delete':
        response$ = this.delete(reqInfo);
        break;
      default: {
        const error: IErrorMessage = {
          message: `Method ${reqInfo.method.toUpperCase()} not allowed`,
          detailedMessage: 'Only methods GET, POST, PUT and DELETE are allowed'
        };
        LOG.error('Has received a method not allowed', error);
        response$ = Promise.reject(this.utils.createErrorResponseOptions(reqInfo.url, STATUS.METHOD_NOT_ALLOWED, error));
        break;
      }
    }
    return response$;
  }

  abstract getInstance$(collectionName: string, id: string | number): Promise<unknown>;
  abstract getAllByFilter$(
    collectionName: string,
    conditions?: Array<IQueryFilter>,
    asObservable?: boolean
  ): Promise<unknown[]> | /** @deprecated */ Observable<unknown[]>;

  abstract get$(
    collectionName: string,
    id: string,
    query: Map<string, string[]>,
    url: string,
    getJoinFields?: IJoinField[],
    caseSensitiveSearch?: boolean,
    asObservable?: boolean
  ): Promise<
    IHttpResponse<unknown> |
    IHttpResponse<{ data: unknown }> |
    IHttpResponse<unknown[]> |
    IHttpResponse<{ data: unknown[] }> |
    IHttpResponse<IQueryResult<unknown>>
  >;

  private get(
    { collectionName, id, query, url, interceptor, interceptorIds }: IRequestInfo
  ): Promise<IHttpResponse<unknown>> {
    let response$: Promise<IHttpResponse<unknown>>;

    // Caso tenha um interceptador, retorna a resposta do mesmo
    if (interceptor) {
      const intUtils = this.createInterceptorUtils(url, id, interceptorIds, query);
      response$ = this.processInterceptResponse(interceptor, intUtils);
      if (response$) {
        return this.addDelay(response$, this.config.delay);
      }
    }

    response$ = this.get$(collectionName, id, query, url, undefined, undefined, false);
    return this.addDelay(response$, this.config.delay);
  }

  private createJoinTransformGetFn(properties: (string | { field: string, property: string })[]): TransformGetFn {
    return (item: IExtendEntity): IExtendEntity => {
      const result = {};
      properties.forEach(property => {
        if (typeof property === 'string') {
          if (item.hasOwnProperty(property)) {
            result[property] = item[property];
          }
        } else {
          if (item.hasOwnProperty(property.field)) {
            result[property.property] = item[property.field];
          }
        }
      });
      return result;
    };
  }

  protected async applyTransformersGetById(
    collectionName: string, item: IExtendEntity, getJoinFields?: IJoinField[]
  ): Promise<IExtendEntity> {
    let _getJoinFields: IJoinField[];
    const transformGetFn = this.transformGetByIdMap.get(collectionName);

    if (Array.isArray(getJoinFields) && getJoinFields.length > 0) {
      this.adjustJoinFieldsGetById(getJoinFields);
      _getJoinFields = getJoinFields;
    } else {
      _getJoinFields = this.joinnersGetByIdMap.get(collectionName);
    }

    if (_getJoinFields !== undefined) {
      await this.applyJoinFields(item, _getJoinFields);
    }
    if (transformGetFn !== undefined) {
      item = await this.applyTransformGetFn(item, transformGetFn);
    }
    return item;
  }

  protected async applyTransformersGetAll(
    collectionName: string, items: IExtendEntity[], getJoinFields?: IJoinField[]
  ): Promise<void> {
    let _getJoinFields: IJoinField[];
    const transformGetFn = this.transformGetAllMap.get(collectionName);

    if (Array.isArray(getJoinFields) && getJoinFields.length > 0) {
      this.adjustJoinFieldsGetAll(getJoinFields);
      _getJoinFields = getJoinFields;
    } else {
      _getJoinFields = this.joinnersGetAllMap.get(collectionName);
    }

    let index = 0;
    for (let item of items) {
      if (_getJoinFields !== undefined) {
        await this.applyJoinFields(item, _getJoinFields);
      }
      if (transformGetFn !== undefined) {
        item = await this.applyTransformGetFn(item, transformGetFn);
        items[index] = item;
      }
      index++;
    }
  }

  protected async applyJoinFields(item: IExtendEntity, joinFields: IJoinField[]): Promise<IExtendEntity> {
    for (const joinField of joinFields) {
      const isCollectionField = joinField.collectionField !== undefined && joinField.collectionField.trim().length > 0;
      const joinFieldValue = isCollectionField ? item[joinField.collectionField] : item[joinField.fieldId];
      if (joinFieldValue) {
        const fieldDest = joinField.fieldDest ? joinField.fieldDest : joinField.fieldId.substr(0, joinField.fieldId.length - 2);
        if (Array.isArray(joinFieldValue)) {
          const joinFieldValues = joinFieldValue as IExtendEntity[];
          const ids = isCollectionField ? joinFieldValues.map(element => element[joinField.fieldId]) : joinFieldValue;
          const conditions: IQueryFilter[] = [{
            name: 'id',
            fn: this.createFilterArrayFn('id', ids, null)
          }];
          const data = await (this.getAllByFilter$(joinField.collectionSource, conditions, false) as unknown) as IExtendEntity[];
          // Reordena na mesma ordem existente dos ids de busca
          const dataAux = [];
          ids.forEach((id, index) => {
            dataAux[index] = data.find(element => element.id === id);
          });
          if (joinField.joinFields) {
            for (let index = 0; index < dataAux.length; index++) {
              if (dataAux[index] !== undefined) {
                dataAux[index] = await this.applyJoinFields(dataAux[index], joinField.joinFields as IJoinField[]);
              }
            }
          }
          if (joinField.transformerGet instanceof Function) {
            for (let index = 0; index < dataAux.length; index++) {
              if (dataAux[index] !== undefined) {
                dataAux[index] = await this.applyTransformGetFn(dataAux[index], joinField.transformerGet);
              }
            }
          }
          if (isCollectionField) {
            if (joinField.unwrapField && joinField.fieldDest) {
              // eslint-disable-next-line max-len
              console.warn(`Don't use field destination '${joinField.collectionField}[i].${joinField.fieldDest}', because field '${joinField.collectionField}[i].${joinField.fieldId}' is unwrapped.`);
            }
            joinFieldValues.forEach((element: IExtendEntity, index: number, self: IExtendEntity[]) => {
              if (dataAux[index] !== undefined) {
                if (joinField.removeFieldId) {
                  delete element[joinField.fieldId];
                }
                if (joinField.unwrapField) {
                  self[index] = Object.assign(element, dataAux[index]) as IExtendEntity;
                } else {
                  element[fieldDest] = dataAux[index];
                }
              }
            });
          } else {
            if (joinField.removeFieldId) {
              delete item[joinField.fieldId];
            }
            if (joinField.unwrapField) {
              console.warn(`Don't unwrapped field '${joinField.fieldId}', because is an simple array.`);
            }
            item[fieldDest] = dataAux;
          }
        } else {
          let data: IExtendEntity;
          const id = (isCollectionField ? (joinFieldValue as IExtendEntity)[joinField.fieldId] : joinFieldValue) as string;
          data = await this.getInstance$(joinField.collectionSource, id) as IExtendEntity;
          if (data && joinField.joinFields) {
            data = await this.applyJoinFields(data, joinField.joinFields as IJoinField[]);
          }
          if (data && joinField.transformerGet instanceof Function) {
            data = await this.applyTransformGetFn(data, joinField.transformerGet);
          }
          if (data) {
            if (isCollectionField) {
              if (joinField.removeFieldId) {
                delete item[joinField.collectionField][joinField.fieldId];
              }
              if (joinField.unwrapField) {
                if (joinField.fieldDest) {
                  // eslint-disable-next-line max-len
                  console.warn(`Don't use field destination '${joinField.collectionField}.${joinField.fieldDest}', because field '${joinField.collectionField}.${joinField.fieldId}' is unwrapped.`);
                }
                item[joinField.collectionField] = Object.assign(item[joinField.collectionField], data);
              } else {
                item[joinField.collectionField][fieldDest] = data;
              }
            } else {
              if (joinField.removeFieldId) {
                delete item[joinField.fieldId];
              }
              if (joinField.unwrapField) {
                if (joinField.fieldDest) {
                  console.warn(`Don't use field destination '${joinField.fieldDest}', because field '${joinField.fieldId}' is unwrapped.`);
                }
                item = Object.assign(item, data);
              } else {
                item[fieldDest] = data;
              }
            }
          }
        }
      }
    }
    return item;
  }

  protected applyTransformGetFn(item: IExtendEntity, transformfn: TransformGetFn): Promise<IExtendEntity> {
    return new Promise<IExtendEntity>((resolve, reject) => {
      const retorno = transformfn.call(this, item, this) as (IExtendEntity | Observable<IExtendEntity>);
      if (retorno instanceof Observable) {
        retorno.subscribe(itemObs => resolve(itemObs), error => reject(error));
      } else {
        resolve(retorno);
      }
    });
  }

  abstract post$(collectionName: string, id: string, item: unknown, url: string, asObservable?: boolean): Promise<IHttpResponse<unknown>>;

  private post({ collectionName, id, body, url, interceptor, interceptorIds }: IRequestInfo): Promise<IHttpResponse<unknown>> {
    let response$: Promise<IHttpResponse<unknown>>;

    // Caso tenha um interceptador, retorna a resposta do mesmo
    if (interceptor) {
      const intUtils = this.createInterceptorUtils(url, id, interceptorIds, undefined, body);
      response$ = this.processInterceptResponse(interceptor, intUtils);
      if (response$) {
        return this.addDelay(response$, this.config.delay);
      }
    }

    response$ = this.post$(collectionName, id, body, url, false);
    return this.addDelay(response$, this.config.delay);
  }

  protected applyTransformPost(body: unknown, transformfn: TransformPostFn): Promise<IExtendEntity> {
    return new Promise<IExtendEntity>((resolve, reject) => {
      // FIXME - Remover retorno como Observable quando for removido RxJs
      const retorno = transformfn.call(this, body, this) as (IExtendEntity | Promise<IExtendEntity> |
         /** @depreacted */ Observable<IExtendEntity>);
      if (retorno instanceof Observable) {
        retorno.subscribe(item => resolve(item), error => reject(error));
      } else if (retorno instanceof Promise) {
        retorno.then(item => resolve(item)).catch(error => reject(error));
      } else {
        resolve(retorno);
      }
    });
  }

  abstract put$(collectionName: string, id: string, item: unknown, url: string, asObservable?: boolean): Promise<IHttpResponse<unknown>>;

  private put({ collectionName, id, body, url, interceptor, interceptorIds }: IRequestInfo): Promise<IHttpResponse<unknown>> {
    let response$: Promise<IHttpResponse<unknown>>;

    // Caso tenha um interceptador, retorna a resposta do mesmo
    if (interceptor) {
      const intUtils = this.createInterceptorUtils(url, id, interceptorIds, undefined, body);
      response$ = this.processInterceptResponse(interceptor, intUtils);
      if (response$) {
        return this.addDelay(response$, this.config.delay);
      }
    }

    response$ = this.put$(collectionName, id, body, url, false);
    return this.addDelay(response$, this.config.delay);
  }

  protected applyTransformPut(item: IExtendEntity, body: unknown, transformfn: TransformPutFn): Promise<IExtendEntity> {
    return new Promise<IExtendEntity>((resolve, reject) => {
      // FIXME - Remover retorno como Observable quando for removido RxJs
      const retorno = transformfn.call(this, item, body, this) as (IExtendEntity | Promise<IExtendEntity> |
        /** @depreacted */ Observable<IExtendEntity>);
      if (retorno instanceof Observable) {
        retorno.subscribe(itemObs => resolve(itemObs), error => reject(error));
      } else if (retorno instanceof Promise) {
        retorno.then(item => resolve(item)).catch(error => reject(error));
      } else {
        resolve(retorno);
      }
    });
  }

  abstract delete$(collectionName: string, id: string, url: string, asObservable?: boolean): Promise<IHttpResponse<null>>;

  private delete({ collectionName, id, url, interceptor, interceptorIds }: IRequestInfo): Promise<IHttpResponse<unknown>> {
    let response$: Promise<IHttpResponse<unknown>>;

    // Caso tenha um interceptador, retorna a resposta do mesmo
    if (interceptor) {
      const intUtils = this.createInterceptorUtils(url, id, interceptorIds);
      response$ = this.processInterceptResponse(interceptor, intUtils);
      if (response$) {
        return this.addDelay(response$, this.config.delay);
      }
    }

    response$ = this.delete$(collectionName, id, url, false);
    return this.addDelay(response$, this.config.delay);
  }

  protected pagefy(
    queryResults: IQueryResult<IExtendEntity>, queryParams: IQueryParams
  ): IQueryResult<IExtendEntity> | { data: IExtendEntity[] } | IExtendEntity[] {
    if (queryParams.page || this.config.pageEncapsulation) {
      LOG.trace('Body will be returned as QueryResult (hasNext: boolean, items: unknow[])');
    } else if (this.config.dataEncapsulation) {
      LOG.trace('Body will be returned as Data (data: unknow[])');
    } {
      LOG.trace('Body will be returned as Array (unknow[])');
    }
    return (queryParams.page || this.config.pageEncapsulation) ?
      queryResults : this.config.dataEncapsulation ?
        { data: queryResults.items } : queryResults.items;
  }

  protected bodify<T>(data: T): { data: T } | T {
    if (this.config.dataEncapsulation) {
      LOG.trace('Body will be returned as Data (data: unknow)');
    } {
      LOG.trace('Body will be returned as simple JSON (unknow)');
    }
    return this.config.dataEncapsulation ? { data } : data;
  }

  private addDelay(response$: Promise<IHttpResponse<unknown>>, delay: number): Promise<IHttpResponse<unknown>> {
    return delay === 0 ? response$ : delayResponse(response$, (Math.floor((Math.random() * delay) + 1)) || 500);
  }

  private getFieldFilterMap(collectionName: string, field: string): FilterFn | FilterOp | undefined {
    const fieldsFilterMap = this.fieldsFilterMap.get(collectionName);
    if (fieldsFilterMap !== undefined) {
      return fieldsFilterMap.get(field);
    } else {
      return undefined;
    }
  }

  private filterItem(item: IExtendEntity, conditions: IQueryFilter[]): boolean {
    if (conditions === undefined) {
      return true;
    }
    const useFilterOr = conditions.findIndex(cond => cond.or) >= 0;
    return useFilterOr ? this.filterItemOr(item, conditions) : this.filterItemAnd(item, conditions);
  }

  private getFieldValue(item: IExtendEntity, name: string): IExtendEntity | unknown {
    if (name.includes('.')) {
      const root = name.substring(0, name.indexOf('.'));
      const child = name.substring(name.indexOf('.') + 1);
      if (item && item.hasOwnProperty(root)) {
        return this.getFieldValue(item[root] as IExtendEntity, child);
      } else {
        return undefined;
      }
    } else {
      return item[name];
    }
  }

  private filterItemAnd(item: IExtendEntity, conditions: IQueryFilter[]): boolean {
    let ok = true;
    let i = conditions.length;
    let cond: IQueryFilter;
    LOG.trace('Applying the filters on the item with AND conditions only. (Item)', item);
    while (ok && i) {
      i -= 1;
      cond = conditions[i];
      if (cond.fn) {
        ok = cond.fn.call(this, item) as boolean;
      } else {
        const fieldValue = this.getFieldValue(item, cond.name);
        ok = cond.rx.test(fieldValue as string);
      }
    }
    if (ok) {
      LOG.trace('Filters applied to the item match and the item will be returned in the query');
    } else {
      LOG.trace('Filters applied to the item not match and the item will be discarded by the field:', cond.name);
    }
    return ok;
  }

  private filterItemOr(item: IExtendEntity, conditions: IQueryFilter[]): boolean {
    let okOr = false;
    let okAnd = true;
    let i = conditions.length;
    let cond: IQueryFilter;
    LOG.trace('Applying the filters on the item with AND and OR conditions. (Item)', item);
    while (okAnd && i) {
      i -= 1;
      cond = conditions[i];
      if (cond.or) {
        if (!okOr) {
          if (cond.fn) {
            okOr = cond.fn.call(this, item) as boolean;
          } else {
            const fieldValue = this.getFieldValue(item, cond.name);
            okOr = cond.rx.test(fieldValue as string);
          }
        }
        if (okOr) {
          LOG.trace('Condition OR pass to item at the field:', cond.name);
        }
      } else {
        if (cond.fn) {
          okAnd = cond.fn.call(this, item) as boolean;
        } else {
          const fieldValue = this.getFieldValue(item, cond.name);
          okAnd = cond.rx.test(fieldValue as string);
        }
        if (!okAnd) {
          LOG.trace('Condition AND not pass to item at the field:', cond.name);
        }
      }
    }
    if (!okOr) {
      LOG.trace('No OR condition passed for the item to fields:', conditions.filter(cond => cond.or).map(cond => cond.name));
    }
    if (okOr && okAnd) {
      LOG.trace('Filters applied to the item match and the item will be returned in the query');
    }
    return okOr && okAnd;
  }

  private createFilterFn(value: string | string[], filterFn: FilterFn): FieldFn {
    return (item: IExtendEntity): boolean => {
      return filterFn.call(this, value, item) as boolean;
    };
  }

  private createFilterOpFn(field: string, value: string, filterOp: FilterOp, caseSensitive: CaseSensitive): FieldFn {
    return (item: IExtendEntity): boolean => {
      const fieldValue = this.getFieldValue(item, field);
      switch (filterOp) {
        case 'eq':
          if (typeof fieldValue === 'string' && caseSensitive === 'i') {
            return (fieldValue.localeCompare(value, 'en', { sensitivity: 'base' }) === 0);
          } else if (typeof fieldValue === 'boolean') {
            return fieldValue == Boolean(value);
          } else {
            // eslint-disable-next-line eqeqeq
            return fieldValue == value;
          }
        case 'ne':
          if (typeof fieldValue === 'string' && caseSensitive === 'i') {
            return (fieldValue.localeCompare(value, 'en', { sensitivity: 'base' }) !== 0);
          } else if (typeof fieldValue === 'boolean') {
            return fieldValue != Boolean(value);
          } else {
            // eslint-disable-next-line eqeqeq
            return fieldValue != value;
          }
        case 'gt':
          if (typeof fieldValue === 'string' && caseSensitive === 'i') {
            return (fieldValue.localeCompare(value, 'en', { sensitivity: 'base' }) > 0);
          } else {
            return fieldValue > value;
          }
        case 'ge':
          if (typeof fieldValue === 'string' && caseSensitive === 'i') {
            return (fieldValue.localeCompare(value, 'en', { sensitivity: 'base' }) >= 0);
          } else {
            return fieldValue >= value;
          }
        case 'lt':
          if (typeof fieldValue === 'string' && caseSensitive === 'i') {
            return (fieldValue.localeCompare(value, 'en', { sensitivity: 'base' }) < 0);
          } else {
            return fieldValue < value;
          }
        case 'le':
          if (typeof fieldValue === 'string' && caseSensitive === 'i') {
            return (fieldValue.localeCompare(value, 'en', { sensitivity: 'base' }) <= 0);
          } else {
            return fieldValue <= value;
          }
        default:
          return false;
      }
    };
  }

  private createFilterArrayFn(field: string, value: string[], caseSensitive: CaseSensitive): FieldFn {
    return (item: IExtendEntity) => {
      const fieldValue = this.getFieldValue(item, field) as string;
      if (typeof fieldValue === 'string' && caseSensitive === 'i') {
        return value.findIndex(v => (fieldValue.localeCompare(v, 'en', { sensitivity: 'base' }) === 0)) >= 0;
      } else {
        return value.includes(fieldValue);
      }
    };
  }

  protected getQueryParams(collectionName: string, query: Map<string, string[]>, caseSensitiveSearch: boolean): IQueryParams {
    const quickFilter = this.quickFilterMap.get(collectionName);
    const queryParams: IQueryParams = { count: 0 };
    let caseSensitive: CaseSensitive = 'i';
    if (typeof caseSensitiveSearch === 'boolean' && caseSensitiveSearch) {
      caseSensitive = '';
    } else if (typeof this.config.caseSensitiveSearch === 'boolean' && this.config.caseSensitiveSearch) {
      caseSensitive = '';
    }
    LOG.debug(`Filters and orders in database is ${caseSensitive === 'i' ? 'not ' : ''} case sensitive`);
    query.forEach((value: string[], name: string) => {
      if (name === 'fields' || name === '$filter' || name === 'expand') {
        LOG.debug(`Param %c${name}%c is not supported by the library`, cssBIB, '');
      } else if (name === 'page') {
        queryParams['page'] = parseInt(value[0], 10);
      } else if (name === 'pageSize') {
        queryParams['pageSize'] = parseInt(value[0], 10);
      } else if (quickFilter && quickFilter.term === name) {
        if (value[0]) {
          const message = `Query will be %cfiltered%c by quick filter term %c${quickFilter.term}%c applying this with OR to the fields.`;
          LOG.debug(message, cssBIB, '', cssBIG, '', '(Value)', value[0], '(Fields)', quickFilter.fields);
          const fields = quickFilter.fields;
          if (fields !== undefined) {
            if (queryParams['conditions'] === undefined) {
              queryParams['conditions'] = [];
            }
            queryParams.conditions.push(...fields.map<IQueryFilter>((field) => {
              return { name: field, rx: new RegExp(value[0], caseSensitive), or: true };
            }));
          }
        }
      } else if (name === 'order') {
        queryParams['orders'] = new Array<IQueryOrder>();
        value.forEach(field => {
          if (field.includes('.')) {
            LOG.warn('Don\'t support order by child property yet. (Field)', field);
          } else {
            if (field.charAt(0) === '-') {
              queryParams.orders.push({ name: field.substring(1), order: 'desc', caseSensitive });
            } else {
              queryParams.orders.push({ name: field, order: 'asc', caseSensitive });
            }
          }
        })
        const message = `Query will be %cordered%c by fields: `;
        LOG.debug(message, cssBIB, '', queryParams.orders);
      } else {
        if (queryParams['conditions'] === undefined) {
          queryParams['conditions'] = [];
        }
        const condition: IQueryFilter = { name, or: false };
        const filterFn = this.getFieldFilterMap(collectionName, name);
        if (filterFn !== undefined && typeof filterFn === 'function') {
          condition['fn'] = this.createFilterFn(value.length > 1 ? value : value[0], filterFn);
          LOG.debug(`Field %c${name}%c to be filtered by provided function.`, cssBIB, '',
            '(Value)', value.length > 1 ? value : value[0], '(Function)', filterFn);
        } else if (filterFn !== undefined && typeof filterFn === 'string' && value.length === 1) {
          condition['fn'] = this.createFilterOpFn(name, value[0], filterFn, caseSensitive);
          LOG.debug(`Field %c${name}%c to be filtered by operators. `, cssBIB, '', '(Value)', value, '(Operator)', filterFn);
        } else if (value.length > 1) {
          condition['fn'] = this.createFilterArrayFn(name, value, caseSensitive);
          const message = `Field %c${name}%c to be filtered by array function (Array.includes OR Array.findIndex case field is string).`;
          LOG.debug(message, cssBIB, '', '(Filter array values)', value);
        } else {
          condition['rx'] = new RegExp(value[0], caseSensitive);
          LOG.debug(`Field %c${name}%c to be filtered by regex: `, cssBIB, '', condition['rx']);
        }
        queryParams.conditions.push(condition);
      }
    });
    return queryParams;
  }

  protected getQueryParamsRootAndChild(queryParams: IQueryParams): { root: IQueryParams, children: IQueryParams } {
    const hasPagination = (queryParams.page && queryParams.pageSize) ? true : false;
    const hasMultiLevelFilter = queryParams.conditions && queryParams.conditions.some(cond => cond.name.includes('.'));
    let root: IQueryParams;
    let children: IQueryParams;
    if (hasPagination && hasMultiLevelFilter) {
      children = {
        count: 0,
        page: queryParams.page,
        pageSize: queryParams.pageSize,
        conditions: queryParams.conditions.filter(cond => cond.name.includes('.'))
      };
      root = {
        count: 0,
        conditions: queryParams.conditions.filter(cond => !cond.name.includes('.'))
      };
      LOG.debug('Query will be filtered on the root and children with pagination. (Root)', root, '(Children)', children);
    } else if (hasMultiLevelFilter) {
      children = {
        count: 0,
        conditions: queryParams.conditions.filter(cond => cond.name.includes('.'))
      };
      root = {
        count: 0,
        conditions: queryParams.conditions.filter(cond => !cond.name.includes('.'))
      };
      LOG.debug('Query will be filtered on the root and children without pagination. (Root)', root, '(Children)', children);
    } else {
      root = queryParams;
      LOG.debug('Query will be filtered only at the root by applying the following parameters:', queryParams);
    }
    return { root, children };
  }

  protected getAllItems(
    cursor: IQueryCursor<IExtendEntity>, queryResults: IQueryResult<IExtendEntity>, queryParams: IQueryParams
  ): boolean {
    let retorna = false;
    if (cursor) {
      const item = cursor.value;
      if (this.filterItem(item, queryParams.conditions)) {
        if (queryParams.page && queryParams.pageSize) {
          if (queryParams.count < ((queryParams.page - 1) * queryParams.pageSize)) {
            queryParams.count++;
            cursor.continue();
          } else if (queryParams.count < (queryParams.page * queryParams.pageSize)) {
            queryResults.items.push(item);
            queryResults.hasNext = true;
            queryParams.count++;
            cursor.continue();
          } else {
            retorna = true;
          }
        } else {
          queryResults.items.push(item);
          queryResults.hasNext = true;
          cursor.continue();
        }
      } else {
        cursor.continue();
      }
    } else {
      queryResults.hasNext = false;
      retorna = true;
    }
    return retorna;
  }

  protected getAllItemsFilterByChildren(items: IExtendEntity[], queryParams: IQueryParams): IQueryResult<IExtendEntity> {
    const cursor: IQueryCursor<IExtendEntity> = {
      index: 0,
      value: null,
      continue: (): void => null
    };
    const queryResults: IQueryResult<IExtendEntity> = { hasNext: false, items: [] };
    while (cursor.index <= items.length) {
      cursor.value = (cursor.index < items.length) ? items[cursor.index++] : null;
      if (this.getAllItems((cursor.value ? cursor : null), queryResults, queryParams)) {
        break;
      }
    }
    return queryResults;
  }

  private hasRequestInterceptor(
    applyToPath: string,
    method: string,
    collectionName: string,
    uriPaths: string[],
    uriQuery: Map<string, string[]>,
    intInfo: IInterceptorInfo
  ): boolean {
    const interceptorIds: string[] = [];
    const interceptors = this.requestInterceptors.filter(value => {
      return value.applyToPath === applyToPath;
    });
    const interceptor = interceptors.find(value => {
      return this.compareRequestInterceptor(value, method, collectionName, uriPaths, uriQuery, interceptorIds);
    });
    if (interceptor) {
      intInfo['interceptor'] = interceptor;
      if (interceptorIds.length > 0) {
        intInfo['interceptorIds'] = interceptorIds;
      }
      return true;
    } else {
      return false;
    }
  }

  private compareRequestInterceptor(
    interceptor: IRequestInterceptor,
    method: string,
    collectionName: string,
    uriPaths: string[],
    uriQuery: Map<string, string[]>,
    interceptorIds?: string[]
  ): boolean {
    let interceptorPathOk = true;
    let interceptorQueryOk = true;

    if (interceptor.applyToPath !== 'complete' && interceptor.collectionName !== collectionName) {
      return false;
    }

    if (interceptor.method.toLowerCase() !== method.toLowerCase()) {
      return false;
    }

    const intPaths = interceptor.path.split('/').filter(value => value.trim().length > 0);
    // Se possui o mesmo número de segmentos na URL
    interceptorPathOk = intPaths.length === uriPaths.length;
    if (interceptorPathOk) {
      // Avalia se todos os segmentos são iguais
      for (let i = 0; i < intPaths.length && interceptorPathOk; i++) {
        // Se é um segmento 'coriga' descarta o mesmo.
        // Utilizado para interceptar urls tipo: /api/parent/:id/child/:id/action
        if (intPaths[i] === '**') {
          continue;
        }
        if (interceptorIds && interceptorIds instanceof Array &&
          (intPaths[i] === ':id' || (intPaths[i].startsWith('{') && intPaths[i].endsWith('}')))) {
          interceptorIds.push(uriPaths[i]);
          continue;
        }
        interceptorPathOk = intPaths[i] === uriPaths[i];
      }
    }
    if (interceptorPathOk) {
      if (interceptor.query) {
        const intQuery = interceptor.query as Map<string, string[]>;
        for (const item of intQuery.entries()) {
          const params = uriQuery.get(item[0]);
          interceptorQueryOk = params && item[1].every(value => params.includes(value));
          if (!interceptorQueryOk) {
            break;
          }
        }
      }
    }
    return interceptorPathOk && interceptorQueryOk;
  }

  private hasDefaultRequestInterceptor(
    applyToPath: string,
    method: string,
    collectionName: string,
    uriPaths: string[],
    intInfo: IInterceptorInfo
  ): boolean {
    if (Array.isArray(this.config.defaultInterceptors) && this.config.defaultInterceptors.length > 0) {
      const interceptorIds: string[] = [];
      const interceptors = this.config.defaultInterceptors.filter(value => {
        return value.applyToPath === applyToPath;
      });
      const interceptor = interceptors.find(value => {
        return this.compareDefaultRequestInterceptor(value, method, uriPaths, interceptorIds);
      });
      if (interceptor) {
        intInfo['interceptor'] = {
          method,
          collectionName,
          path: interceptor.path,
          response: (utils: IInterceptorUtils) => interceptor.responseFn(collectionName, utils)
        };
        if (interceptorIds.length > 0) {
          intInfo['interceptorIds'] = interceptorIds;
        }
        return true;
      } else {
        return false;
      }
    }
    return false;
  }

  private compareDefaultRequestInterceptor(
    interceptor: IDefaultInterceptor,
    method: string,
    uriPaths: string[],
    interceptorIds?: string[]
  ): boolean {
    let interceptorPathOk = true;

    if (interceptor.method.toLowerCase() !== method.toLowerCase()) {
      return false;
    }

    const intPaths = interceptor.path.split('/').filter(value => value.trim().length > 0);
    // Se possui o mesmo número de segmentos na URL
    interceptorPathOk = intPaths.length === uriPaths.length;
    if (interceptorPathOk) {
      // Avalia se todos os segmentos são iguais
      for (let i = 0; i < intPaths.length && interceptorPathOk; i++) {
        // Se é um segmento 'coriga' descarta o mesmo.
        // Utilizado para interceptar urls tipo: /api/parent/:id/child/:id/action
        if (intPaths[i] === '**') {
          continue;
        }
        if (interceptorIds && interceptorIds instanceof Array &&
          (intPaths[i] === ':id' || (intPaths[i].startsWith('{') && intPaths[i].endsWith('}')))) {
          interceptorIds.push(uriPaths[i]);
          continue;
        }
        interceptorPathOk = intPaths[i] === uriPaths[i];
      }
    }
    return interceptorPathOk;
  }


  private processInterceptResponse(
    interceptor: IRequestInterceptor, utils: IInterceptorUtils
  ): Promise<IHttpResponse<unknown>> {
    LOG.trace('Response will be processed by the interceptor.', '(Interceptor Utils)', utils);
    const response = this.interceptResponse(interceptor, utils);
    if (response instanceof Promise) {
      return response;
    }
    if (response instanceof Observable) {
      return firstValueFrom(response);
    }
    if (response !== undefined) {
      return new Promise((resolve, reject) => {
        if ((response as IHttpErrorResponse).error) {
          reject(response);
        } else {
          resolve(response);
        }
      });
    }
    LOG.trace('Response of interceptor is undefined. Processing default response.');
    return undefined;
  }

  private interceptResponse(interceptor: IRequestInterceptor, utils: IInterceptorUtils):
    IHttpResponse<unknown> | IHttpErrorResponse | Promise<IHttpResponse<unknown>> |
    /** @deprecated */ Observable<IHttpResponse<unknown>> | undefined {
    let response: IHttpResponse<unknown>;
    if (interceptor.response) {
      if (interceptor.response instanceof Function) {
        LOG.trace('That interceptor response is one function and call that. (Function)', interceptor.response);
        response = interceptor.response.call(this, utils) as IHttpResponse<unknown>;
      } else {
        LOG.trace('That interceptor response is one JSON then clone it. (JSON)', interceptor.response);
        response = deepClone(interceptor.response);
      }
    }
    return response;
  }

  /**
   * Get location info from a url, even on server where `document` is not defined
   */
  private getLocation(url: string): IUriInfo {
    if (!url.startsWith('http')) {
      const originalUrl = url;
      // get the document iff running in browser
      const doc: Document = (typeof document === 'undefined') ? undefined : document;
      // add host info to url before parsing.  Use a fake host when not in browser.
      const base = doc ? doc.location.protocol + '//' + doc.location.host : 'http://fake';
      url = url.startsWith('/') ? base + url : base + '/' + url;
      LOG.trace('Does not HTTP url request. Parsing URL usind discovered URL. (Original URL, Discover URL)', originalUrl, url);
    }
    return parseUri(url);
  }

  private applyReplaceMap(pathSegments: string[]): string[] {
    for (const item of this.replaceMap.entries()) {
      const replaces = item[1];
      let match = true;
      for (const segments of replaces) {
        let i = 0;
        match = true;
        // TODO - TRACE - Log segments x pathSegments to compare
        for (; i < segments.length && match; i++) {
          if (i >= (pathSegments.length)) {
            match = false;
          } else {
            if (segments[i] !== pathSegments[i]) {
              match = false;
            }
          }
        }
        if (match) {
          const deteted = pathSegments.splice(0, i, item[0]);
          LOG.debug('Applying replace URL segments map. (Deleted segments)',
            deteted, '(Replace segment)', item[0], '(URL segments)', pathSegments);
          break;
        }
      }
      if (match) {
        break;
      }
    }
    return pathSegments;
  }

  /**
   * Parses the request URL into a `ParsedRequestUrl` object.
   * Parsing depends upon certain values of `config`: `apiBase`, `host`, and `urlRoot`.
   *
   * Configuring the `apiBase` yields the most interesting changes to `parseRequestUrl` behavior:
   *   When apiBase=undefined and url='http://localhost/api/collection/42'
   *     {base: 'api/', collectionName: 'collection', id: '42', ...}
   *   When apiBase='some/api/root/' and url='http://localhost/some/api/root/collection'
   *     {base: 'some/api/root/', collectionName: 'collection', id: undefined, ...}
   *   When apiBase='/' and url='http://localhost/collection'
   *     {base: '/', collectionName: 'collection', id: undefined, ...}
   *
   * The actual api base segment values are ignored. Only the number of segments matters.
   * The following api base strings are considered identical: 'a/b' ~ 'some/api/' ~ `two/segments'
   *
   * To replace this default method, assign your alternative to your InMemDbService['parseRequestUrl']
   */
  protected parseRequestUrl(method: string, url: string, intInfo: IInterceptorInfo): IParsedRequestUrl {
    try {
      const parsed: IParsedRequestUrl = {
        apiBase: undefined,
        collectionName: undefined,
        id: undefined,
        query: undefined,
        resourceUrl: undefined,
      };
      LOG.debug('Start parser URL: %s for METHOD: %s', url, method);
      const loc = this.getLocation(url);
      let drop = this.config.rootPath.length;
      let urlRoot = '';
      if (loc.host !== this.config.host) {
        // url for a server on a different host!
        // assume it's collection is actually here too.
        drop = 1; // the leading slash
        urlRoot = loc.protocol + '//' + loc.host + '/';
        LOG.debug('Request host is diferent from configuration host.', '(Req Host)', loc.host, '(Config Host)', this.config.host);
      }
      const path = loc.path.substring(drop);
      LOG.debug('Path after discard host and rootPath. (Path)', path);
      const query = paramParser(loc.query);
      if (query.size > 0) {
        LOG.debug('Query params received to the request. (Query)', query);
      }
      let pathSegments = path.split('/').filter(value => value.trim().length > 0);
      parsed.query = query;

      if (this.hasRequestInterceptor('complete', method, null, pathSegments, query, intInfo)) {
        LOG.debug('Has %ccomplete%c interceptor to the path.', cssBIB, '(Parsed)', parsed, '(Interceptor)', intInfo);
        return parsed;
      }

      // apiBase: the front part of the path devoted to getting to the api route
      // Assumes first path segment if no config.apiBase
      // else ignores as many path segments as are in config.apiBase
      // Does NOT care what the api base chars actually are.
      // eslint-disable-next-line eqeqeq
      if (this.config.apiBase == undefined) {
        parsed.apiBase = pathSegments.splice(0, 1)[0]; // pathSegments[segmentIx++];
        LOG.debug('Assuming the first segment as the Base API, and remove it from URL segments. (Base API)',
          parsed.apiBase, '(URL segments)', pathSegments);
      } else {
        parsed.apiBase = removeLeftSlash(removeRightSlash(this.config.apiBase.trim()));
        if (parsed.apiBase) {
          pathSegments.splice(0, parsed.apiBase.split('/').length);
        }
        LOG.debug('Defined Base API, and remove it from URL segments. (Base API)', parsed.apiBase, '(URL segments)', pathSegments);
      }
      parsed.apiBase += '/';


      pathSegments = this.applyReplaceMap(pathSegments);
      parsed.collectionName = pathSegments.splice(0, 1)[0]; // pathSegments[segmentIx++];
      // ignore anything after a '.' (e.g.,the "json" in "customers.json")
      parsed.collectionName = parsed.collectionName && parsed.collectionName.split('.')[0];
      LOG.debug('Defined collection name, and remove it from URL segments. (Collection name)',
        parsed.collectionName, '(URL segments)', pathSegments);
      parsed.resourceUrl = urlRoot + parsed.apiBase + parsed.collectionName + '/';

      if (this.hasRequestInterceptor('beforeId', method, parsed.collectionName, pathSegments, query, intInfo)) {
        LOG.debug('Has %cbeforeId%c interceptor to the collection name.', cssBIB, '(Parsed)', parsed, '(Interceptor)', intInfo);
        return parsed;
      }

      if (this.hasDefaultRequestInterceptor('beforeId', method, parsed.collectionName, pathSegments, intInfo)) {
        LOG.debug('Has %cbeforeId%c interceptor to the configuration database.', cssBIB, '(Parsed)', parsed, '(Interceptor)', intInfo);
        return parsed;
      }

      parsed.id = pathSegments.splice(0, 1)[0]; // pathSegments[segmentIx++];
      LOG.debug('Defined collection id, and remove it from URL segments. (Collection id)',
        parsed.id, '(URL segments)', pathSegments);

      if (parsed.id) {
        if (this.hasRequestInterceptor('afterId', method, parsed.collectionName, pathSegments, query, intInfo)) {
          LOG.debug('Has %cafterId%c interceptor to the collection name.', cssBIB, '(Parsed)', parsed, '(Interceptor)', intInfo);
          return parsed;
        }
        if (this.hasDefaultRequestInterceptor('afterId', method, parsed.collectionName, pathSegments, intInfo)) {
          LOG.debug('Has %cafterId%c interceptor to the configuration database.', cssBIB, '(Parsed)', parsed, '(Interceptor)', intInfo);
          return parsed;
        }
      }

      const extras = pathSegments.length > 0 ? pathSegments.join('/') : undefined;
      if (extras) {
        parsed['extras'] = extras;
        LOG.debug('Defined extras paths for the request. (Extras)', extras);
      }

      LOG.debug('Defined parsed object for the request . (Parsed)', parsed);
      return parsed;

    } catch (err) {
      LOG.error(`Unable to parse url '${url}'; original error:`, err);
      const msg = `Unable to parse url '${url}'; original error: ${(err as Error).message}`;
      throw new Error(msg);
    }
  }

  private getPostToOtherMethod(collectionName: string, urlExtras?: string, query?: Map<string, string[]>, body?: IExtendEntity): string {
    let method = 'POST';
    let postsToOtherMethod = this.postToOtherMethodMap.get(collectionName);
    if (postsToOtherMethod === undefined) {
      postsToOtherMethod = this.config.postsToOtherMethod;
    }
    if (postsToOtherMethod !== undefined) {
      let found = false;
      for (const postToOtherMethod of postsToOtherMethod) {
        switch (postToOtherMethod.applyTo) {
          case 'urlSegment': {
            const segments = urlExtras ? urlExtras.split('/').filter(value => value.trim().length > 0) : [];
            found = segments.reverse().filter(segment => segment === postToOtherMethod.value).length > 0;
            if (found) {
              LOG.debug('Has one config mapping to POST to other method by url segment',
                '(Segment)', postToOtherMethod.value, '(Other METHOD)', postToOtherMethod.otherMethod);
            }
            break;
          }
          case 'queryParam': {
            const queryParam = query ? query.get(postToOtherMethod.param) : undefined;
            found = queryParam && queryParam.length > 0 && queryParam[0] === postToOtherMethod.value;
            if (found) {
              LOG.debug('Has one config mapping to POST to other method by query parameter',
                '(Query param)', postToOtherMethod.param, '(Param value)', postToOtherMethod.value,
                '(Other METHOD)', postToOtherMethod.otherMethod);
            }
            break;
          }
          case 'bodyParam': {
            found = body && body[postToOtherMethod.param] && body[postToOtherMethod.param] === postToOtherMethod.value;
            if (found) {
              LOG.debug('Has one config mapping to POST to other method by body parameter',
                '(Body param)', postToOtherMethod.param, '(Param value)', postToOtherMethod.value,
                '(Other METHOD)', postToOtherMethod.otherMethod)
              delete body[postToOtherMethod.param];
            }
            break;
          }
        }
        if (found) {
          method = postToOtherMethod.otherMethod;
          break;
        }
      }
    }
    return method;
  }

  /**
   * get or create the function that passes unhandled requests
   * through to the "real" backend.
   */
  protected getPassThruBackend(): IPassThruBackend {
    return this.passThruBackend ?
      this.passThruBackend :
      this.passThruBackend = this.utils.createPassThruBackend();
  }

  private createFilterConditions(conditions: IConditionsParam): IQueryFilter[] {
    const queryConditions: IQueryFilter[] = [];
    let caseSensitive: CaseSensitive = 'i';
    if (typeof this.config.caseSensitiveSearch === 'boolean' && this.config.caseSensitiveSearch) {
      caseSensitive = '';
    }
    for (const name in conditions) {
      if (conditions.hasOwnProperty(name)) {
        const condition: IQueryFilter = { name, or: false };
        const param = conditions[name];
        if (param.filter !== undefined && typeof param.filter === 'function') {
          condition['fn'] = this.createFilterFn(param.value, param.filter);
        } else if (param.filter !== undefined && typeof param.filter === 'string' && !Array.isArray(param.value)) {
          condition['fn'] = this.createFilterOpFn(name, param.value, param.filter, caseSensitive);
        } else if (Array.isArray(param.value)) {
          condition['fn'] = this.createFilterArrayFn(name, param.value, caseSensitive);
        } else {
          condition['rx'] = new RegExp(param.value, caseSensitive);
        }
        queryConditions.push(condition);
      }
    }
    return queryConditions;
  }

  private createInterceptorUtils(
    url: string, id?: string, interceptorIds?: string[], query?: Map<string, string[]>, body?: unknown
  ): IInterceptorUtils {
    return {
      url,
      id,
      interceptorIds,
      query,
      body,
      fn: {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        response: this.utils.createResponseOptions as ResponseFn,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        errorResponse: this.utils.createErrorResponseOptions as ErrorResponseFn,
        conditions: this.createFilterConditions.bind(this) as ConditionsFn
      }
    };
  }

  protected dispatchErrorToResponse(reject: (error: IHttpErrorResponse) => void, url: string, error: unknown): void {
    let message: string;
    let detailedMessage: unknown;
    if (typeof error === 'string') {
      message = error;
    } else if (error instanceof Error) {
      message = error.message
      detailedMessage = error;
    } else if (typeof error === 'object') {
      message = (error.hasOwnProperty('message')) ?
        (error as IErrorMessage).message : 'Ocorreu um erro desconhecido ao executar o comando';
      detailedMessage = (error.hasOwnProperty('detailedMessage')) ?
        (error as IErrorMessage).detailedMessage : error;
    } else {
      message = 'Ocorreu um erro desconhecido ao executar o comando';
      detailedMessage = error;
    }
    const errorMessage: IErrorMessage = { message };
    if (detailedMessage) {
      errorMessage.detailedMessage = detailedMessage;
    }
    reject(this.utils.createErrorResponseOptions(url, STATUS.INTERNAL_SERVER_ERROR, errorMessage));
  }

  protected orderItems(collectionName: string, items: IExtendEntity[], orders: IQueryOrder[]): IExtendEntity[] {
    const collectionCompareMap = this.fieldsCompareMap.get(collectionName);
    // utility functions
    const defaultCmp = function (a: unknown, b: unknown, caseSensitive: CaseSensitive): number {
      if (typeof a === 'string' && caseSensitive === 'i') {
        return a.localeCompare(b as string, 'en', { sensitivity: 'base' });
      }
      if (a == b) return 0;
      return a < b ? -1 : 1;
    };
    const getCmpFunc = function (primer?: (v: unknown) => unknown, reverse?: boolean, caseSensitive?: CaseSensitive) {
      const dfc = defaultCmp;
      let cmp = defaultCmp;
      if (primer) {
        cmp = function (a, b) {
          return dfc(primer(a), primer(b), caseSensitive);
        };
      }
      if (reverse) {
        return function (a: unknown, b: unknown, caseSensitive: CaseSensitive) {
          return -1 * cmp(a, b, caseSensitive);
        };
      }
      return cmp;
    };
    const getCustomFunc = function (compareFn: CompareFn, reverse?: boolean) {
      if (reverse) {
        return function (a: unknown, b: unknown, caseSensitive: CaseSensitive) {
          return -1 * compareFn(a, b, caseSensitive);
        };
      }
      return compareFn;
    };

    type Field = {
      name: string;
      cmp: CompareFn;
      caseSensitive: CaseSensitive;
    }

    // actual implementation
    const sortBy = function (orders: IQueryOrder[]) {
      const fields: Field[] = [];

      const n_fields = orders.length;

      let order: IQueryOrder;
      let name: string;
      let cmp: CompareFn;
      let fieldCmp: CompareFn;

      // preprocess sorting options
      for (let i = 0; i < n_fields; i++) {
        order = orders[i];
        name = order.name;
        if (collectionCompareMap && (fieldCmp = collectionCompareMap.get(name))) {
          cmp = getCustomFunc(fieldCmp, order.order === 'desc');
        } else {
          cmp = getCmpFunc(undefined, order.order === 'desc', order.caseSensitive);
        }
        fields.push({
          name,
          cmp,
          caseSensitive: order.caseSensitive
        });
      }

      // final comparison function
      return function (a: unknown, b: unknown) {
        let name: string;
        let result: number;
        let field: Field;
        for (let i = 0; i < n_fields; i++) {
          result = 0;
          field = fields[i];
          name = field.name;

          result = field.cmp(a[name], b[name], field.caseSensitive);
          if (result !== 0) break;
        }
        return result;
      }
    }
    return items.sort(sortBy(orders));
  }

  protected createFetchBackend(): IPassThruBackend {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    try {
      return new class FetchBackend implements IPassThruBackend {

        async handle(req: IRequestCore<unknown>): Promise<IHttpResponse<unknown> | IHttpErrorResponse> {
          const url = req.urlWithParams || req.url;
          const init: RequestInit = {
            method: req.method,
            headers: req.headers as unknown as Headers,
            body: undefined
          }
          if (req.body && typeof req.body == 'object') {
            (init.headers as Headers).set('Content-Type', 'application/json');
            init.body = JSON.stringify(req.body);
          }

          const response = await fetch(url, init);
          if (response.ok) {

            let body: any;
            if (response.headers.get('Content-Type').includes('application/json')) {
              body = await response.json();
            } else {
              body = await response.blob();
            }
            return self.utils.createResponseOptions(response.url, response.status, body);
          } else {
            throw response;
          }
        }
      }
    }
    catch (ex) {
      (ex as Error).message = `Cannot create passThru404 backend; ${(ex as Error).message || ''}`;
      throw ex;
    }
  }

}
