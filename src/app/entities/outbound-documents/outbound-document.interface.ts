export interface IOutboundDocumentItems {
  productId: number;
  quantity: number;
}

export interface IOutboundDocument {
  id?: number;
  identifier: string;
  customerId: number;
  items: IOutboundDocumentItems[];
  createdAt?: Date;
  updatedAt?: Date;
}
