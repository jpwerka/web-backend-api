import { BackendTypeArgs } from '../interfaces/configuration.interface';

export class BackendType implements BackendTypeArgs {
  constructor(dbtype: BackendTypeArgs = {}) {
    Object.assign(this, { dbtype: 'memory' }, dbtype);
  }
}
