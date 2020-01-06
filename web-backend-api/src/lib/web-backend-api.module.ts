import { HttpBackend, XhrFactory } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { getBackendService } from './data-service/backend-data.mapper';
import { BACKEND_SERVICE, HttpClientBackendService } from './http-client-backend.service';
import { IBackendService } from './interfaces/interface.index';


export function httpClientBackendServiceFactory(
  dbService: IBackendService,
  xhrFactory: XhrFactory,
): HttpBackend {
  return new HttpClientBackendService(dbService, xhrFactory);
}

@NgModule({})
export class WebBackendApiModule {

  static forRoot(): ModuleWithProviders {
    return {
      ngModule: WebBackendApiModule,
      providers: [
        { provide: BACKEND_SERVICE, useFactory: getBackendService },
        { provide: HttpBackend,
          useFactory: httpClientBackendServiceFactory,
          deps: [BACKEND_SERVICE, XhrFactory]}
      ]
    };
  }

  static forFeature(): ModuleWithProviders {
    return WebBackendApiModule.forRoot();
  }
}
