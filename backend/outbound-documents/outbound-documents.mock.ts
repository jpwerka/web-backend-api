import { IOutboundDocument } from 'src/app/entities/outbound-document/outbound-document.interface';

export const collectionName = 'outbound_documents';

export const outboundDocuments: IOutboundDocument[] =
[
  {
    id: 1,
    identifier: '4167161881',
    customerId: 2,
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
    identifier: '2226863794',
    customerId: 1,
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
    identifier: '4279187362',
    customerId: 5,
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
    customerId: 3,
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
    customerId: 1,
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

export function transformPost(body: IOutboundDocument): IOutboundDocument {
  body['createdAt'] = new Date();
  body['isLoaded'] = false;
  return body;
}

export function transformPut(document: IOutboundDocument, body: IOutboundDocument): IOutboundDocument {
  body['updatedAt'] = new Date();
  return body;
}
