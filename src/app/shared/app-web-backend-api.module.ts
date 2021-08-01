import { ModuleWithProviders, NgModule } from '@angular/core';

@NgModule({})
export class AppWebBackendApiModule {
  static forRoot(): ModuleWithProviders<AppWebBackendApiModule> {
    return {
      ngModule: AppWebBackendApiModule,
      providers: [] // Empty module
    };
  }

  static forFeature(): ModuleWithProviders<AppWebBackendApiModule> {
    return AppWebBackendApiModule.forRoot();
  }
}
