/**
 * Types and interfaces for BÚNKER POS Navigation design system.
 */

export type NavigationProposal = 'A' | 'B' | 'C';

export type DeviceType = 'phone' | 'phone-large' | 'tablet-portrait' | 'tablet-landscape';

export type ActiveView = 
  | 'inicio' 
  | 'mesas' 
  | 'cocina' 
  | 'caja' 
  | 'categorias'
  | 'platos'       // Logística -> Menú (Platos)
  | 'insumos'      // Logística -> Inventario (Insumos)
  | 'recetarios'   // Logística -> Recetarios (Costeo)
  | 'kardex'       // Logística -> Kardex
  | 'auditoria'    // Logística -> Auditoría
  | 'usuarios'
  | 'reportes'
  | 'soporte'
  | 'ajustes';

export interface MenuItem {
  id: ActiveView;
  label: string;
  icon: string;
  category?: 'principal' | 'logistica' | 'otros';
}

export interface Plate {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  emoji: string;
}

export interface KitchenTicket {
  id: string;
  table: string;
  items: string[];
  time: string;
  status: 'pending' | 'preparing' | 'ready';
  elapsedMinutes: number;
}

export interface RestaurantTable {
  id: string;
  number: number;
  zone: 'Salón Principal' | 'Terraza' | 'VIP';
  status: 'available' | 'occupied' | 'reserved' | 'billing';
  currentTotal?: number;
  people: number;
}
