
import { XhrFactory } from '@angular/common';
import { HttpBackend } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { getBackendService, IBackendService } from '../../database';
import { DownloadDataService } from './download-data.service';
import { BACKEND_SERVICE, HttpClientBackendService } from './http-client-backend.service';

export function httpClientBackendServiceFactory(
  dbService: IBackendService,
  xhrFactory: XhrFactory,
): HttpBackend {
  return new HttpClientBackendService(dbService, xhrFactory);
}

@NgModule({})
export class WebBackendApiModule {

  static forRoot(): ModuleWithProviders<WebBackendApiModule> {
    return {
      ngModule: WebBackendApiModule,
      providers: [
        { provide: BACKEND_SERVICE, useFactory: getBackendService },
        { provide: HttpBackend,
          useFactory: httpClientBackendServiceFactory,
          deps: [BACKEND_SERVICE, XhrFactory]
        },
        DownloadDataService,
      ]
    };
  }

  static forFeature(): ModuleWithProviders<WebBackendApiModule> {
    return WebBackendApiModule.forRoot();
  }
}
