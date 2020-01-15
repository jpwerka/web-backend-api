import { ModuleWithProviders, NgModule } from '@angular/core';

@NgModule({})
export class AppWebBackendApiModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: AppWebBackendApiModule,
      providers: [] // Empty module
    };
  }

  static forFeature(): ModuleWithProviders {
    return AppWebBackendApiModule.forRoot();
  }
}
