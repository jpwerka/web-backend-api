export type FilterFn = (value: string|string[], item: any) => boolean;

export type FilterOp =
  | 'eq' // Equal
  | 'ne' // Not equal
  | 'gt' // Greater than
  | 'ge' // Greater than or equal
  | 'lt' // Less than
  | 'le' // Less than or equal
  ;

export interface IQuickFilter {
  term: string;
  fields: string[];
}

export interface IQueryFilter {
  name: string;
  rx?: RegExp;
  fn?: FilterFn;
  or?: boolean;
}

export interface IQueryParams {
  count: number;
  page?: number;
  pageSize?: number;
  conditions?: Array<IQueryFilter>;
  useFilterOr?: boolean;
}

export interface IQueryResult {
  hasNext: boolean;
  items: Array<any>;
}

export interface IQueryCursor {
  value: any;
  continue(): void;
}
