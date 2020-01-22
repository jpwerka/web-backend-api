import { IOutboundDocument } from '../outbound-document/outbound-document.interface';

export interface IOutboundLoad {
  id?: number;
  identifier: string;
  documentsId: number[]; // ids of outbound documents
  documents?: IOutboundDocument[];
  createdAt?: Date;
  updatedAt?: Date;
}

