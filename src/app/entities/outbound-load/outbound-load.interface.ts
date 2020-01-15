export interface IOutboundLoad {
  id?: number;
  identifier: string;
  documents: number[]; // ids of outbound documents
  createdAt?: Date;
  updatedAt?: Date;
}

