export interface ICustomer {
  id?: string;
  name: string;
  active: boolean;
}

export const collectionCustomers = 'customers';
export const customers: ICustomer[] = [
  {
    id: '1d1b8d76-c15e-45ce-af95-b73c02bb6458',
    name: 'Customer 12345',
    active: true,
  },
  {
    id: '88abb967-374a-4b99-9466-f7dcaf0af710',
    name: 'Customer 23451',
    active: true,
  },
  {
    id: '0bea5d85-0682-4017-ac11-b6d198daa97e',
    name: 'Customer 34512',
    active: true,
  },
];

export interface IProduct {
  id?: string;
  code: string;
  codBar: string;
  description: string;
  active: boolean;
}

export const collectionProducts = 'products';

export const products: IProduct[] = [
  {
    id: '0bfe34b3-b711-44e6-be6e-a9eca13e30b0',
    code: '12345',
    codBar: '7891234567890',
    description: 'Product 12345',
    active: true,
  },
  {
    id: '58d43d6c-64c2-495a-8bb1-b029a7a8bd2d',
    code: '23451',
    codBar: '7892345678901',
    description: 'Product 23451',
    active: true,
  },
  {
    id: 'def13e47-b256-4f81-8e6a-f47504ef3827',
    code: '34512',
    codBar: '7893456789012',
    description: 'Product 34512',
    active: true,
  },
  {
    id: '0042d0d7-1f02-4e29-99aa-5080786983bc',
    code: '45123',
    codBar: '7894567890123',
    description: 'Product 45123',
    active: false,
  },
  {
    id: '1d35dcf7-e4b7-49f9-8bc8-6113a76aa3fe',
    code: '51234',
    codBar: '7895678901234',
    description: 'Product 51234',
    active: true,
  },
];

export interface IOutboundDocument {
  id?: string;
  identifier: string;
  customerId: string;
  customer?: Partial<ICustomer>;
  items: Array<{
    productId: string;
    product?: Partial<IProduct>;
    quantity: number;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
  isLoaded?: boolean;
}

export const collectionDocuments = 'outbound_document';

export const documents: IOutboundDocument[] = [
  {
    id: 'ea6d47dc-86ef-49b2-8ff4-700dfa110ae2',
    identifier: '4167161881',
    customerId: customers[1].id,
    createdAt: new Date('2019-10-28T23:58:30Z'),
    items: [
      {
        productId: products[1].id,
        quantity: 45
      },
      {
        productId: products[4].id,
        quantity: 12
      },
    ],
    isLoaded: false,
  },
  {
    id: '68c7dd19-81f0-4d9e-a1b1-68c5b6392b6c',
    identifier: '2226863794',
    customerId: customers[0].id,
    createdAt: new Date('2019-10-03T12:53:30Z'),
    updatedAt: new Date('2019-10-03T17:33:57Z'),
    items: [
      {
        productId: products[2].id,
        quantity: 20
      },
      {
        productId: products[3].id,
        quantity: 6
      },
    ],
    isLoaded: true,
  },
  {
    id: '4135b691-09c4-440a-98e8-b6b685ab920b',
    identifier: '2345187362',
    customerId: customers[1].id,
    createdAt: new Date('2019-09-27T08:23:17Z'),
    items: [
      {
        productId: products[4].id,
        quantity: 1
      },
      {
        productId: products[2].id,
        quantity: 4
      },
    ],
    isLoaded: true,
  },
  {
    id: '1468f139-f707-4bed-9328-05e98db47ab5',
    identifier: '5703254555',
    customerId: '0bea5d85-0682-4017-ac11-b6d198daa97e',
    createdAt: new Date('2019-10-28T14:09:48Z'),
    items: [
      {
        productId: products[1].id,
        quantity: 2
      },
      {
        productId: products[2].id,
        quantity: 6
      },
    ],
    isLoaded: true,
  },
  {
    id: '24a96f8e-d3ce-470c-8768-62d9d64d5808',
    identifier: '978342308',
    customerId: customers[0].id,
    createdAt: new Date('2019-12-18T07:09:48Z'),
    items: [
      {
        productId: products[0].id,
        quantity: 2
      },
      {
        productId: products[4].id,
        quantity: 6
      },
    ],
    isLoaded: false,
  }
];
