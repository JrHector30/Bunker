export type TableStatus = 'free' | 'occupied' | 'reserved' | 'billing' | 'cleaning';

export type TableZone = 'all' | 'main_hall' | 'terrace' | 'bar_lounge' | 'vip_room';

export type TableShape = 'round' | 'rect' | 'rect_h' | 'square' | 'booth' | 'bar_stool';

export interface OrderItem {
  id: string;
  name: string;
  category: 'entrante' | 'principal' | 'bebida' | 'postre';
  price: number;
  quantity: number;
  status: 'ordered' | 'cooking' | 'ready' | 'served';
  cookedBy?: string;
  minutesElapsed: number;
  notes?: string;
}

export interface TableItem {
  id: string;
  number: number;
  name: string;
  zone: 'main_hall' | 'terrace' | 'bar_lounge' | 'vip_room';
  capacity: number;
  guestsCount: number;
  status: TableStatus;
  waiterId?: string;
  waiterName?: string;
  waiterAvatar?: string;
  seatedAt?: string; // ISO or human time e.g. "19:45"
  seatedMinutes?: number;
  reservationTime?: string;
  reservationName?: string;
  billRequestedAt?: string;
  isDelayed?: boolean;
  delayMinutes?: number;
  delayReason?: string;
  activeOrders: OrderItem[];
  notes?: string;
  position: {
    x: number; // percentage in floor plan
    y: number; // percentage in floor plan
    width: number;
    height: number;
    shape: TableShape;
  };
}

export type StaffRole = 'waiter' | 'chef';

export interface StaffBadge {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  avatar: string;
  zone: string;
  shiftStart: string;
  activeTablesCount: number;
  completedOrders: number;
  avgSpeedMinutes: number; // e.g. 11.4 min
  targetSpeedMinutes: number; // e.g. 15.0 min
  speedScore: number; // 0 - 100 or 1-10
  totalSales: number;
  estimatedTips: number;
  rating: number; // 1 - 5 stars e.g. 4.9
  rank: number;
  badges: StaffBadge[];
  currentStatus: 'active' | 'busy' | 'break';
  station?: string; // For chefs e.g. "Parrilla & Brasas"
  trend: 'up' | 'down' | 'stable';
  recentAchievements?: string[];
}

export type RevenuePeriod = 'day' | 'week' | 'month' | 'year';

export interface RevenueDataPoint {
  timeLabel: string;
  revenue: number;
  previousRevenue: number;
  ordersCount: number;
  avgTicket: number;
  guestsCount: number;
}

export interface CategoryBreakdown {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  ordersCount: number;
}

export interface HourlyHeatPoint {
  hour: string;
  occupancyRate: number; // 0 - 100
  revenue: number;
  isPeak: boolean;
}

export interface OperationalAlert {
  id: string;
  type: 'warning' | 'info' | 'ready' | 'urgent';
  title: string;
  message: string;
  timestamp: string;
  tableNumber?: number;
  actionText?: string;
}
