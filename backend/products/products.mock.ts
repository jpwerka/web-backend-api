import { IProduct } from 'src/app/entities/product/product.interface';

export const collectionName = 'products';

export const products: IProduct[] = [
  {
    id: 1,
    code: '12345',
    codBar: '7891234567890',
    description: 'Product 12345',
    active: true,
  },
  {
    id: 2,
    code: '23451',
    codBar: '7892345678901',
    description: 'Product 23451',
    active: true,
  },
  {
    id: 3,
    code: '34512',
    codBar: '7893456789012',
    description: 'Product 34512',
    active: true,
  },
  {
    id: 4,
    code: '45123',
    codBar: '7894567890123',
    description: 'Product 45123',
    active: false,
  },
  {
    id: 5,
    code: '51234',
    codBar: '7895678901234',
    description: 'Product 51234',
    active: true,
  },
];

