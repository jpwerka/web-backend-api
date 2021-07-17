import { IBackendService } from '../../src/public-api';

export function configureBackendUtils(dbService: IBackendService): void {
  dbService.backendUtils({
    createResponseOptions: (url, status, body) => ({ url, status, body }),
    createErrorResponseOptions: (url, status, error) => ({ url, status, error }),
    createPassThruBackend: () => ({ handle: () => { throw new Error('Method not implemented.'); } })
  });
}
