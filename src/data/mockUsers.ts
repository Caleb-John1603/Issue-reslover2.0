import { User } from '../types';

export const MOCK_USERS: (User & { password: string })[] = [
  {
    id: 'u1',
    name: 'John Public',
    email: 'john@example.com',
    password: 'password123',
    role: 'public',
  },
  {
    id: 'u2',
    name: 'Jane Citizen',
    email: 'jane@example.com',
    password: 'password123',
    role: 'public',
  },
  {
    id: 's1',
    name: 'Officer Smith',
    email: 'smith@cityhall.gov',
    password: 'admin123',
    role: 'servant',
  },
  {
    id: 's2',
    name: 'Inspector Jones',
    email: 'jones@cityhall.gov',
    password: 'admin123',
    role: 'servant',
  }
];
