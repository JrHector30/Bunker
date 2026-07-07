export type OrderStatus = 'pendiente' | 'proceso' | 'listo';

export interface Order {
  id: string;
  quantity: number;
  name: string;
  table: string;
  createdAt: number; // timestamp in milliseconds
  elapsedMinutesOffset: number; // mock additional minutes to test the time critical state
  status: OrderStatus;
  chef?: string;
  modifier?: string; // e.g. "Parte pierna", "Helada", "Sin bbq"
  history: OrderStatus[]; // track status changes to allow undoing
}

export interface Chef {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface SoundSetting {
  enabled: boolean;
  volume: number; // 0 to 1
}
