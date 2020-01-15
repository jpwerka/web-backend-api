import { ICustomer } from 'src/app/entities/customer/customer.interface';

export const collectionName = 'customers';

export const customers: ICustomer[] = [
  {
    id: 1,
    name: 'Customer 12345',
    active: true,
  },
  {
    id: 2,
    name: 'Customer 23451',
    active: true,
  },
  {
    id: 3,
    name: 'Customer 34512',
    active: true,
  },
  {
    id: 4,
    name: 'Customer 45123',
    active: false,
  },
  {
    id: 5,
    name: 'Customer 51234',
    active: true,
  },
];

