import { ModuleWithProviders, NgModule } from '@angular/core';
import { WebBackendApiModule } from 'web-backend-api/src';

@NgModule({})
export class AppWebBackendApiModule {
  static forRoot(): ModuleWithProviders {
    return WebBackendApiModule.forRoot();
  }

  static forFeature(): ModuleWithProviders {
    return WebBackendApiModule.forFeature();
  }
}
