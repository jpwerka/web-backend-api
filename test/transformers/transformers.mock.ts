import { ExtendEntity } from '../../src/data-service/backend.service';

export interface IProduct extends ExtendEntity {
  id?: string;
  code: string;
  codBar: string;
  description: string;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
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
];
