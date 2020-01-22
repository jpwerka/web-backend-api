import { ICustomer } from '../customer/customer.interface';

export interface IOutboundDocumentItems {
  productId: number;
  quantity: number;
}

export interface IOutboundDocument {
  id?: number;
  identifier: string;
  customerId: number;
  customer?: ICustomer;
  items: IOutboundDocumentItems[];
  createdAt?: Date;
  updatedAt?: Date;
  isLoaded?: boolean;
}
