import { IOutboundLoad } from 'src/app/entities/outbound-load/outbound-load.interface';

export const collectionName = 'outbound_loads';

export const outboundLoads: IOutboundLoad[] = [
  {
    id: 1,
    identifier: '5310652224',
    createdAt: new Date('2019-10-28T17:17:17Z'),
    documentsId: [2, 3]
  },
  {
    id: 2,
    identifier: '6817751546',
    createdAt: new Date('2019-09-18T11:30:25Z'),
    updatedAt: new Date('2019-09-26T06:18:52Z'),
    documentsId: [4]
  }
];

export function transformPost(body: IOutboundLoad): IOutboundLoad {
  body['createdAt'] = new Date();
  return body;
}

export function transformPut(load: IOutboundLoad, body: IOutboundLoad): IOutboundLoad {
  body['updatedAt'] = new Date();
  return body;
}

