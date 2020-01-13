import { Injectable } from '@angular/core';
import { stringify } from 'json5';
import { Observable } from 'rxjs';
import { getBackendService } from './data-service/backend-data.mapper';
import { IBackendService } from './interfaces/backend.interface';


@Injectable()
export class DownloadDataService {

  private dbService: IBackendService;

  constructor() {
    this.dbService = getBackendService();
  }

  listCollections(): string[] {
    return this.dbService.listCollections();
  }

  downloadAsJson(collectionName: string, v5: boolean = true): Observable<any> {
    return new Observable(observer => {

      this.dbService.getAllByFilter$(collectionName, undefined).subscribe(items => {
        const contentStr = encodeURIComponent(v5 ? stringify(items, { space: 2 }) : JSON.stringify(items, null, 2));
        const dataStr = 'data:text/json;charset=utf-8,' + contentStr;
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', collectionName + '.json');
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        observer.next();
        observer.complete();
      },
      (error) => observer.error(error));
    });
  }

}
