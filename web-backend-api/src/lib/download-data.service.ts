import { Injectable } from '@angular/core';
import { stringify } from 'json5';
import { camelCase, kebabCase, upperFirst } from 'lodash-es';
import { Observable } from 'rxjs';
import { getBackendService } from './data-service/backend-data.mapper';
import { IBackendService } from './interfaces/backend.interface';

export type GetDataType = 'json' | 'json5' | 'typescript';

export interface ITypescriptInfo {
  hasInterface: boolean;
  interfaceName?: string;
  convertDate?: boolean;
}

@Injectable()
export class DownloadDataService {

  private dbService: IBackendService;

  constructor() {
    this.dbService = getBackendService();
  }

  listCollections(): string[] {
    return this.dbService.listCollections();
  }

  downloadAsJson(collectionName: string, v5 = true): Observable<void> {
    return this.getOrDownloadData(collectionName, v5 ? 'json5' : 'json', true) as Observable<void>;
  }

  downloadData(collectionName: string, getDataType: GetDataType = 'json5', tsInfo?: ITypescriptInfo): Observable<void> {
    return this.getOrDownloadData(collectionName, getDataType, true, tsInfo) as Observable<void>;
  }

  getAllData(collectionName: string, getDataType: GetDataType = 'json5', tsInfo?: ITypescriptInfo): Observable<string> {
    return this.getOrDownloadData(collectionName, getDataType, false, tsInfo) as Observable<string>;
  }

  // eslint-disable-next-line max-len
  private getOrDownloadData(collectionName: string, getDataType: GetDataType, isDownload: boolean, tsInfo?: ITypescriptInfo): Observable<void | string> {
    return new Observable(observer => {

      this.dbService.getAllByFilter$(collectionName, undefined).subscribe(items => {
        let dataStr = getDataType === 'json' ? JSON.stringify(items, null, 2) : stringify(items, { space: 2 });
        if (getDataType === 'typescript') {
          const camelCaseName = camelCase(collectionName);
          const singleName = camelCaseName.endsWith('es') ?
            camelCaseName.substr(0, camelCaseName.length - 2) : camelCaseName.endsWith('s') ?
              camelCaseName.substr(0, camelCaseName.length - 1) : camelCaseName;
          const interfaceName = tsInfo && tsInfo.hasInterface ?
            (tsInfo.interfaceName ? tsInfo.interfaceName + '[]' : ': I' + upperFirst(singleName) + '[]') : '';
          let tsStr = 'export const collectionName = \'' + collectionName + '\';\n';
          tsStr += 'export const ' + camelCaseName + interfaceName + ' =\n';
          if (tsInfo.convertDate) {
            const rx = /('\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z')/gm;
            dataStr = tsStr + dataStr.replace(rx, 'new Date($1)');
          } else {
            dataStr = tsStr + dataStr;
          }
        }
        if (isDownload) {
          const contentStr = 'data:text/json;charset=utf-8,' + dataStr;
          const fileName = (getDataType === 'typescript') ? kebabCase(collectionName) + '.mock.ts' : collectionName + '.json';
          const downloadAnchorNode = document.createElement('a');
          downloadAnchorNode.setAttribute('href', contentStr);
          downloadAnchorNode.setAttribute('download', fileName);
          document.body.appendChild(downloadAnchorNode); // required for firefox
          downloadAnchorNode.click();
          downloadAnchorNode.remove();
          observer.next();
        } else {
          observer.next(dataStr);
        }
        observer.complete();
      },
      (error) => observer.error(error));
    });
  }
}
