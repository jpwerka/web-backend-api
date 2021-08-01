import { IBackendService, STATUS } from '../../src/public-api';

export function configureBackendUtils(dbService: IBackendService): void {
  dbService.backendUtils({
    createResponseOptions: (url, status, body) => {
      const result = { url, status, body };
      if (status === STATUS.CREATED) {
        result['location'] = `Location ID: ${body['id']}`
      }
      return result;
    },
    createErrorResponseOptions: (url, status, error) => ({ url, status, error }),
    createPassThruBackend: () => ({ handle: () => { throw new Error('Method not implemented.'); } })
  });
}
