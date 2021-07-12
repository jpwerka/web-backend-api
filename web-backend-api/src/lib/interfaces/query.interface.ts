export type FilterFn = (value: string|string[], item: unknown) => boolean;

export type FilterOp =
  | 'eq' // Equal
  | 'ne' // Not equal
  | 'gt' // Greater than
  | 'ge' // Greater than or equal
  | 'lt' // Less than
  | 'le' // Less than or equal
  ;

export type FieldFn = (item: unknown) => boolean;

export interface IEntity {
  id?: string | number;
}

export interface IExtendEntity extends IEntity {
  [key: string]: unknown;
}

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

export interface IQueryParams {
  count: number;
  page?: number;
  pageSize?: number;
  conditions?: IQueryFilter[];
}

export interface IQueryResult {
  hasNext: boolean;
  items: IExtendEntity[];
}

export interface IQueryCursor {
  index: number;
  value: IExtendEntity;
  continue(): void;
}
