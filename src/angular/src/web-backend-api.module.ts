
import { HttpBackend } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { IBackendService, getBackendService } from '../../database';
import { DownloadDataService } from './download-data.service';
import { BACKEND_SERVICE, HttpClientBackendService } from './http-client-backend.service';

function httpClientBackendServiceFactory(
  dbService: IBackendService,
): HttpBackend {
  return new HttpClientBackendService(dbService);
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
          deps: [BACKEND_SERVICE]
        },
        DownloadDataService,
      ]
    };
  }

  static forFeature(): ModuleWithProviders<WebBackendApiModule> {
    return WebBackendApiModule.forRoot();
  }
}
