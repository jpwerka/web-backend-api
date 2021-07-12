import { LoadFn, IBackendService } from '../interfaces/backend.interface';
import { BackendConfig } from './backend-config';
import { BackendType } from './backend-type';
import { BackendConfigArgs, BackendTypeArgs } from '../interfaces/configuration.interface';
import { MemoryDbService } from './memory-db.service';
import { IndexedDbService } from './indexed-db.service';

const dataServiceFn = new Map<string, LoadFn[]>();

const backendConfig: BackendConfigArgs = new BackendConfig();
export function getBackendConfig(): BackendConfigArgs {
  return backendConfig;
}

const backendType: BackendTypeArgs = new BackendType();
export function getBackendType(): BackendTypeArgs {
  return backendType;
}

export function dataService(collectionName: string, loadFn: LoadFn): void {
  if (dataServiceFn.has(collectionName)) {
    dataServiceFn.get(collectionName).push(loadFn);
  } else {
    dataServiceFn.set(collectionName, [loadFn]);
  }
}

let dbService: IBackendService;
export function getBackendService(): IBackendService {
  return dbService;
}

export function setupBackend(config?: BackendConfigArgs, dbtype?: BackendTypeArgs): Promise<boolean> {

  if (config) {
    Object.assign(backendConfig, config);
  }

  if (dbtype) {
    Object.assign(backendType, dbtype);
  }

  if (backendType.dbtype === 'memory') {
    dbService = new MemoryDbService(backendConfig);
  } else {
    dbService = new IndexedDbService(backendConfig, backendType.databaseName);
  }

  const result$ = new Promise<boolean>((resolve, reject) => {
    dbService.deleteDatabase().then(() => {
      dbService.createDatabase().then(() => {
        dbService.createObjectStore(dataServiceFn).then(() => {
          console.log('[WebBackendApi]', 'Database data created!');
          resolve(true);
        }, error => {
          console.error('[WebBackendApi]', error);
          reject(error);
        });
      }, error => {
        console.error('[WebBackendApi]', error);
        reject(error);
      });
    }, error => {
      console.error('[WebBackendApi]', error);
      reject(error);
    });
  });
  return result$;
}
