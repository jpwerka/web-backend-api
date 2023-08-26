export interface IOutboundDocument {
  id?: number;
  identifier: string;
  description: string;
  customerId: number;
  customer?: {
    id?: number;
    name: string;
  };
  items: Array<{
    productId: number;
    quantity: number;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
  isLoaded?: boolean;
}

export const collectionDocuments = 'outbound_document';

export const documents: IOutboundDocument[] = [
  {
    id: 1,
    identifier: '4167161881',
    description: 'DOCUMENT 003',
    customerId: 2,
    customer: {
      id: 2,
      name: 'Customer 23451',
    },
    createdAt: new Date('2019-10-28T23:58:30Z'),
    items: [
      {
        productId: 2,
        quantity: 45
      },
      {
        productId: 5,
        quantity: 12
      },
    ],
    isLoaded: false,
  },
  {
    id: 2,
    identifier: '2345187362',
    description: 'DOCUMENT 009',
    customerId: 1,
    customer: {
      id: 1,
      name: 'Customer 12345',
    },
    createdAt: new Date('2019-10-03T12:53:30Z'),
    updatedAt: new Date('2019-10-03T17:33:57Z'),
    items: [
      {
        productId: 3,
        quantity: 20
      },
      {
        productId: 4,
        quantity: 6
      },
    ],
    isLoaded: true,
  },
  {
    id: 3,
    identifier: '2226863794',
    description: 'document 001',
    customerId: 2,
    customer: {
      id: 2,
      name: 'Customer 23451',
    },
    createdAt: new Date('2019-09-27T08:23:17Z'),
    items: [
      {
        productId: 5,
        quantity: 1
      },
      {
        productId: 3,
        quantity: 4
      },
    ],
    isLoaded: true,
  },
  {
    id: 4,
    identifier: '5703254555',
    description: 'document 004',
    customerId: 3,
    customer: {
      id: 3,
      name: 'Customer 34512',
    },
    createdAt: new Date('2019-10-28T14:09:48Z'),
    items: [
      {
        productId: 2,
        quantity: 2
      },
      {
        productId: 3,
        quantity: 6
      },
    ],
    isLoaded: true,
  },
  {
    id: 5,
    identifier: '978342308',
    description: 'Document 006',
    customerId: 1,
    customer: {
      id: 1,
      name: 'Customer 12345',
    },
    createdAt: new Date('2019-12-18T07:09:48Z'),
    items: [
      {
        productId: 1,
        quantity: 2
      },
      {
        productId: 5,
        quantity: 6
      },
    ],
    isLoaded: false,
  }
];
