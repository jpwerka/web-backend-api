
import { HttpBackend } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { getBackendService } from '../../../database';
import { BACKEND_SERVICE } from '../../src/http-client-backend.service';
import { HttpClientTestingBackendService } from './http-client-testing-backend.service';

// export function httpClientBackendServiceFactory(
//   dbService: IBackendService,
//   xhrFactory: XhrFactory,
// ): HttpBackend {
//   return new HttpClientTestingBackendService(dbService, xhrFactory);
// }

@NgModule({})
export class WebBackendApiTestingModule {

  static forRoot(): ModuleWithProviders<WebBackendApiTestingModule> {
    return {
      ngModule: WebBackendApiTestingModule,
      providers: [
        HttpClientTestingBackendService,
        {
          provide: BACKEND_SERVICE,
          useFactory: getBackendService
        },
        // {
        //   provide: HttpClientTestingBackendService,
        //   // useFactory: httpClientBackendServiceFactory,
        //   deps: [BACKEND_SERVICE, XhrFactory]
        // },
        {
          provide: HttpBackend,
          useExisting: HttpClientTestingBackendService
        }
      ]
    };
  }
}
