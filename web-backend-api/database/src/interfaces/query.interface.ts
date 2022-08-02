export type CaseSensitive = 'i' | '';

export type FilterFn = (value: string | string[], item: unknown, caseSensitive: CaseSensitive) => boolean;

export type FilterOp =
| 'eq' // Equal
| 'ne' // Not equal
| 'gt' // Greater than
| 'ge' // Greater than or equal
| 'lt' // Less than
| 'le' // Less than or equal
;

export type FieldFn = (item: unknown) => boolean;

export type CompareFn = (a: unknown, b: unknown, caseSensitive: CaseSensitive) => number;

export interface IQuickFilter {
  term: string;
  fields: string[];
}

export interface IQueryFilter {
  name: string;
  rx?: RegExp;
  fn?: FieldFn;
  or?: boolean;
}

export interface IQueryOrder {
  name: string;
  order: 'asc' | 'desc',
  caseSensitive: CaseSensitive;
}
export interface IQueryParams {
  count: number;
  page?: number;
  pageSize?: number;
  conditions?: IQueryFilter[];
  orders?: IQueryOrder[];
}

export interface IQueryResult<T> {
  hasNext: boolean;
  items: T[];
}

export interface IQueryCursor<T> {
  index: number;
  value: T;
  continue(): void;
}
