# Web Backend API

Library to simulate a backend API for use in WEB projects.

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
import { ICustomer } from "src/app/entities/customer/customer.interface";

export const collectionName = "customers";

export const customers: ICustomer[] = [
  { id: 1, name: "Customer 12345" },
  { id: 2, name: "Customer 23451" },
  { id: 3, name: "Customer 34512" },
  { id: 4, name: "Customer 45123" },
  { id: 5, name: "Customer 51234" },
];
```

File: `customers.data.ts`

```typescript
import { dataService, IBackendService } from "web-backend-api";
import { collectionName, customers } from "./customers.mock";

dataService(collectionName, (dbService: IBackendService) => {
  // Load initial clients to backend
  customers.forEach((customer) => {
    dbService.storeData(collectionName, customer);
  });
});
```

_**Note:** To view all possible configurations for a collection see all methods in: [IBackendService](https://github.com/jpwerka/web-backend-api/blob/master/src/interfaces/backend.interface.ts)\
To view a sample project that use the lib, see: [Web Backend API Sample](https://github.com/jpwerka/web-backend-api-sample)_

## How to use with an Angular App

It's necessariy load all scripts that configure the backends data for use in application.

To start and load all data to simulate backend is necessary create a different main entry file. In this sample use a main-mock.ts

```typescript
import { enableProdMode } from "@angular/core";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { AppModule } from "./app/app.module";
import { environment } from "./environments/environment";
import { setupBackend, BackendConfigArgs } from "web-backend-api/src";

if (environment.production) {
  enableProdMode();
}

// Define directory where find all *.data.ts files
const dirDataSoruce = "../backend/";

// Then we find all the mocks. For until angular 14
// declare const require: any;
// const context = require.context(dirDataSoruce, true, /\.data\.ts$/);

// Then we find all the mocks. For angular above 14
const context = (import.meta as any).webpackContext(dirDataSoruce, {
  recursive: true,
  regExp: /\.data\.ts$/,
});

// And load the modules.
context.keys().map(context);

const config: BackendConfigArgs = {
  post204: false, // return the item in body after POST
  put204: false, // return the item in body after PUT
};
setupBackend(config, { dbtype: "memory" })
  .then(() => {
    platformBrowserDynamic()
      .bootstrapModule(AppModule)
      .then(() => {
        console.log("[Backend]", "Backend database application started!");
      })
      .catch((err) => console.error(err));
  })
  .catch((err) => console.error(err));
```

_**Note:** To view all possible configurations for a setup backend, see all configurations flags in: [BackendConfigArgs](https://github.com/jpwerka/web-backend-api/blob/master/src/interfaces/configuration.interface.ts)_

To enable the different main entry file is necessary create a configuration in `angular.json` file another configuration in configurations node.

```json
...
  "configurations": {
    "production": { ... },
    "mock-backend": {
      "main": "src/main-mock.ts",
      ...
    }
  }
```

After this step, it's necessary replace angular default [HttpBackend](https://angular.io/api/common/http/HttpBackend) providers.
To allow this crete a service to simulate mock backend with this configuration (sugestion): [HttpMockBackendService](https://github.com/jpwerka/web-backend-api-sample/blob/master/src/mocks/http-mock-backend.service.ts)

Create the module taht configure replace provider for your application:

```typescript
import { HttpBackend } from "@angular/common/http";
import { ModuleWithProviders, NgModule } from "@angular/core";
import { IBackendService, getBackendService } from "web-backend-api";
import {
  BACKEND_SERVICE,
  HttpMockBackendService,
} from "./http-mock-backend.service";

function httpMockBackendFactory(dbService: IBackendService): HttpBackend {
  return new HttpMockBackendService(dbService);
}

@NgModule({})
export class MockBackendApiModule {
  static forRoot(): ModuleWithProviders<MockBackendApiModule> {
    return {
      ngModule: MockBackendApiModule,
      providers: [
        { provide: BACKEND_SERVICE, useFactory: getBackendService },
        {
          provide: HttpBackend,
          useFactory: httpMockBackendFactory,
          deps: [BACKEND_SERVICE],
        },
      ],
    };
  }

  static forFeature(): ModuleWithProviders<MockBackendApiModule> {
    return MockBackendApiModule.forRoot();
  }
}
```

Import the MockBackendApiModule into your root AppModule

```typescript
import { MockBackendApiModule } from "./shared/mocks/mock-backend-api.module";
```

Add MockBackendApiModule.forRoot() to your AppModule's import array

```typescript
@NgModule({
  imports : [CommonModule, MockBackendApiModule.forRoot(), ...],
})
export class AppModule {}
```

To start your application with simulate backend use:

```bash
$ ng serve --configuration="mock-backend"
```

## Separate backend from production

To separate backend from production is necessary create an environment in your application configuration that load web-backend-api when necessary and don't load it when unnecessary.

In yours enviroments files, create a property with name `imports` and add reference to the module use to load `web-backend-api.

File `src/environments/environment.mock.ts` is the module used for simulate backend configuration.

```typescript
import { MockBackendApiModule } from "src/mocks/mock-backend-api.module";

export const environment = {
  production: false,
  imports: [MockBackendApiModule.forRoot()],
};
```

File `src/environments/environment.prod.ts` is the module used for production configuration.

```typescript
export const environment = {
  production: true,
  imports: [],
};
```

Change configuration in `angular.json` file include file replacement for this module to configuration `production`

```json
...
  "configurations": {
    "mock-backend": {
      "main": "src/main-mock.ts",
      "tsConfig": "tsconfig.mock.json",
      "fileReplacements": [
        {
          "replace": "src/environments/environment.ts",
          "with": "src/environments/environment.mock.ts"
        }
      ],
      . . .
    }
  }
```

Add `environment.imports` to your AppModule's import array

```typescript
import { environment } from './../environments/environment';
. . .

@NgModule({
  imports : [
    CommonModule,
    . . ., // other modules
    ...environment.imports
  ],
})
export class AppModule {}
```

## Changes and Updates

View [CHANGELOG](https://github.com/jpwerka/web-backend-api/blob/master/CHANGELOG.md)

## Autor

[**Jackson Patrick Werka**](mailto:jpwerka@gmail.com)

## Licença

This project is public, licensed under the MIT license.
