import { Order } from '../types';

export const getInitialOrders = (): Order[] => {
  const now = Date.now();
  
  return [
    // PENDIENTES
    {
      id: 'p1',
      quantity: 1,
      name: 'Fetuccini a la Huancaina con Lomo',
      table: 'MESA 11',
      createdAt: now - 60000, // 1 min ago
      elapsedMinutesOffset: 0,
      status: 'pendiente',
      history: ['pendiente']
    },
    {
      id: 'p2',
      quantity: 1,
      name: 'Arroz con Mariscos',
      table: 'MESA 7',
      createdAt: now, // 0 min ago
      elapsedMinutesOffset: 0,
      status: 'pendiente',
      history: ['pendiente']
    },
    {
      id: 'p3',
      quantity: 1,
      name: 'Caldo de Gallina',
      table: 'MESA 13',
      createdAt: now,
      elapsedMinutesOffset: 0,
      status: 'pendiente',
      modifier: 'Parte pierna',
      history: ['pendiente']
    },
    {
      id: 'p4',
      quantity: 1,
      name: 'Inka Cola 500ml',
      table: 'MESA 13',
      createdAt: now,
      elapsedMinutesOffset: 0,
      status: 'pendiente',
      modifier: 'Helada',
      history: ['pendiente']
    },

    // EN PROCESO
    {
      id: 'ip1',
      quantity: 1,
      name: 'Parrilla Familiar',
      table: 'MESA 7',
      createdAt: now,
      elapsedMinutesOffset: 0,
      status: 'proceso',
      chef: 'Hector',
      history: ['pendiente', 'proceso']
    },
    {
      id: 'ip2',
      quantity: 1,
      name: 'Inka Cola 500ml',
      table: 'MESA 7',
      createdAt: now,
      elapsedMinutesOffset: 0,
      status: 'proceso',
      chef: 'Hector',
      history: ['pendiente', 'proceso']
    },

    // LISTOS
    {
      id: 'l1',
      quantity: 1,
      name: 'Inka Cola 500ml',
      table: 'MESA 8',
      createdAt: now,
      elapsedMinutesOffset: 0,
      status: 'listo',
      chef: 'Hector',
      history: ['pendiente', 'proceso', 'listo']
    },
    {
      id: 'l2',
      quantity: 1,
      name: 'Flan Casero',
      table: 'MESA 9',
      createdAt: now,
      elapsedMinutesOffset: 0,
      status: 'listo',
      chef: 'Hector',
      history: ['pendiente', 'proceso', 'listo']
    },
    {
      id: 'l3',
      quantity: 1,
      name: 'Tequeños BBQ',
      table: 'MESA 2',
      createdAt: now,
      elapsedMinutesOffset: 0,
      status: 'listo',
      modifier: 'Sin bbq',
      history: ['pendiente', 'proceso', 'listo']
    },
    {
      id: 'l4',
      quantity: 1,
      name: 'Tequeños BBQ',
      table: 'MESA 5',
      createdAt: now,
      elapsedMinutesOffset: 0,
      status: 'listo',
      chef: 'Hector',
      history: ['pendiente', 'proceso', 'listo']
    }
  ];
};
