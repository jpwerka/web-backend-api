/* eslint-disable @typescript-eslint/no-unsafe-call */
import * as _cloneDeep from 'clonedeep';

export function cloneDeep<T>(data: T): T {
  return _cloneDeep(data) as T;
}