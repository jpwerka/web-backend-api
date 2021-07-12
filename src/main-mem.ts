/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { setupBackend, BackendConfigArgs } from 'web-backend-api/src';


if (environment.production) {
  enableProdMode();
}

declare const require: any;

// Then we find all the mocks.
const context = require.context('../backend/', true, /\.data\.ts$/);
// And load the modules.
context.keys().map(context);

const config: BackendConfigArgs = {
  post204: false, // return the item in body after POST
  put204: false, // return the item in body after PUT
  pageEncapsulation: false,
  log: true
};
setupBackend(config, {dbtype: 'indexdb'}).then(() => {
  platformBrowserDynamic().bootstrapModule(AppModule).then(
    () => {
      console.log('[Backend]', 'Backend database application started!');
    }
  ).catch(err => console.error(err));
}).catch(err => console.error(err));
