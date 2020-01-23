# Web Backend API

Library to simulate a backend API for use in angular projects.

When using this mock library, it will not be necessary to run any other service or application to simulate the backend, since it will run together with the application at run time.

The library allows working with restful applications, applications that use concepts from different end-points to interact with the user for the same data collection.\
If it does not meet your needs, it is possible to implement an interceptor that will process the request and send a customized response.

This library was inspired by two other most used libraries and combines in a simplified way some the features of both:\
[Angular => in-memory-web-api](https://github.com/angular/in-memory-web-api)\
[MockServer => mockserver-client-node](https://github.com/mock-server/mockserver-client-node)

## Installation

To install this library, run:

```bash
$ npm install web-backend-api --save
```

## Setup the app project

To simulate backend is necessary create a collection files that have the configuration about every collection used in application

Sample tree project:
```
 '-> backend
 |  '-> ** (collection folders)
 '-> src
    '-> app
```

To separate info and configuration of data, create two files (optional):

File: `customers.mock.ts`
```typescript
import { ICustomer } from 'src/app/entities/customer/customer.interface';

export const collectionName = 'customers';

export const customers: ICustomer[] = [
  { id: 1, name: 'Customer 12345' },
  { id: 2, name: 'Customer 23451' },
  { id: 3, name: 'Customer 34512' },
  { id: 4, name: 'Customer 45123' },
  { id: 5, name: 'Customer 51234' },
];
```

File: `customers.data.ts`
```typescript
import { dataService, IBackendService } from 'web-backend-api/src';
import { collectionName, customers } from './customers.mock';

dataService(collectionName, (dbService: IBackendService) => {

  // Load initial clients to backend
  customers.forEach((customer) => {
    dbService.storeData(collectionName, customer);
  });
});
```

_**Note:** To view all possible configurations for a collection see all methods in: [IBackendService](https://github.com/jpwerka/web-backend-api/blob/master/web-backend-api/src/lib/interfaces/backend.interface.ts)\
To view a sample project that use the lib, see: [Web Backend API Sample](https://github.com/jpwerka/web-backend-api)_


To start and load all data to simulate backend is necessary create a different main entry file. In this sample use a main-mem.ts

```typescript
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { setupBackend, BackendConfigArgs } from 'web-backend-api/src';


if (environment.production) {
  enableProdMode();
}

declare const require: any;

// Define directory where find all *.data.ts files
const dirDataSoruce = '../backend/';
// Then we find all the mocks.
const context = require.context(dirDataSoruce, true, /\.data\.ts$/);
// And load the modules.
context.keys().map(context);

const config: BackendConfigArgs = {
  post204: false, // return the item in body after POST
  put204: false // return the item in body after PUT
};
setupBackend(config, {dbtype: 'memory'}).then(() => {
  platformBrowserDynamic().bootstrapModule(AppModule).then(
    () => {
      console.log('[Backend]', 'Backend database application started!');
    }
  ).catch(err => console.error(err));
}).catch(err => console.error(err));

```
_**Note:** To view all possible configurations for a setup backend, see all configurations flags in: [BackendConfigArgs](https://github.com/jpwerka/web-backend-api/blob/master/web-backend-api/src/lib/interfaces/configuration.interface.ts)_


To enable the different main entry file is necessary create a configuration in `angular.json` file another configuration in configurations node.
```json
...
  "configurations": {
    "production": { ... },
    "backend": {
      "main": "src/main-mem.ts",
      ...
    }
  }
```

Import the WebBackendApiModule into your root AppModule

```typescript
import { WebBackendApiModule } from 'web-backend-api';
```

Add WebBackendApiModule.forRoot() to your AppModule's import array

```typescript
@NgModule({
  imports : [CommonModule, WebBackendApiModule.forRoot(), ...],
})
export class AppModule {}
```

To start your application with simulate backend use:
```bash
$ ng serve --configuration=backend
```

## Separate backend from production

To separate backend from production is necessary create an module in your app that load web-backend-api when necessary and don't load it when unnecessary.

Create the same module in two different folders in your app:

File `backend/app-web-backend-api.module.ts` is the module used for backend configuration.
```typescript
import { ModuleWithProviders, NgModule } from '@angular/core';
import { WebBackendApiModule } from 'web-backend-api';

@NgModule({})
export class AppWebBackendApiModule {
  static forRoot(): ModuleWithProviders {
    return WebBackendApiModule.forRoot();
  }

  static forFeature(): ModuleWithProviders {
    return WebBackendApiModule.forFeature();
  }
}
```

File `shared/app-web-backend-api.module.ts` is the module used for production configuration.
```typescript
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
```
Import the WebBackendApiModule into your root AppModule

```typescript
import { AppWebBackendApiModule } from './backend/app-web-backend-api.module';
```

Add WebBackendApiModule.forRoot() to your AppModule's import array

```typescript
@NgModule({
  imports : [CommonModule, AppWebBackendApiModule.forRoot(), ...],
})
export class AppModule {}
```
Change configuration in `angular.json` file include file replacement for this module to configuration `production`
```json
...
  "configurations": {
    "production": { 
      "fileReplacements": [
        {
          "replace": "src/app/backend/app-web-backend-api.module.ts",
          "with": "src/app/shared/app-web-backend-api.module.ts"
        }
      ],
    }
  }
```
When app load and start this module is load too, but, was this an empty module then nothing is changed for production.

## Autor

[**Jackson Patrick Werka**](mailto:jpwerka@gmail.com)

## Licença

This project is public, licensed under the MIT license.
