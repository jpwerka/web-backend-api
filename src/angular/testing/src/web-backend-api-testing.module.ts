
import { HttpBackend } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { IBackendService, getBackendService } from '../../../database';
import { BACKEND_SERVICE } from '../../src/http-client-backend.service';
import { HttpClientTestingBackendService } from './http-client-testing-backend.service';

export function httpClientBackendServiceFactory(
  dbService: IBackendService
): HttpBackend {
  return new HttpClientTestingBackendService(dbService);
}

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
        {
          provide: HttpClientTestingBackendService,
          useFactory: httpClientBackendServiceFactory,
          deps: [BACKEND_SERVICE]
        },
        {
          provide: HttpBackend,
          useExisting: HttpClientTestingBackendService
        }
      ]
    };
  }
}
