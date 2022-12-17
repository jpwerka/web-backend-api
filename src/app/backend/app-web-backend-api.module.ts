import { ModuleWithProviders, NgModule } from '@angular/core';
import { WebBackendApiModule } from 'web-backend-api/angular';

@NgModule({})
export class AppWebBackendApiModule {
  static forRoot(): ModuleWithProviders<WebBackendApiModule> {
    return WebBackendApiModule.forRoot();
  }

  static forFeature(): ModuleWithProviders<WebBackendApiModule> {
    return WebBackendApiModule.forFeature();
  }
}
