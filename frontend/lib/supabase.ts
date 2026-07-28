import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos base do domínio
export type Role = 'ADMIN' | 'ALMOXARIFE' | 'GESTOR';
export type ItemType = 'CONSUMABLE' | 'ASSET';
export type ItemStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
export type MovementType = 'DELIVERY' | 'RETURN' | 'LOSS' | 'REPLACEMENT' | 'WRITEOFF';

export interface Profile {
  id: string;
  name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  name: string;
  registration: string;
  job_title: string;
  sector: string;
  unit: string;
  status: EmployeeStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  name: string;
  description?: string;
  type: ItemType;
  category_id: string;
  quantity: number;
  min_stock: number;
  lot_number?: string;
  expires_at?: string;
  unit: string;
  patrimony_code?: string;
  serial_number?: string;
  current_holder_id?: string;
  status: ItemStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  type: MovementType;
  item_id: string;
  employee_id?: string;
  user_id: string;
  quantity: number;
  notes?: string;
  item_name: string;
  employee_name?: string;
  employee_registration?: string;
  created_at: string;
  // joined
  user_name?: string;
  user_role?: Role;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalItems: number;
  deliveriesMonth: number;
  returnsMonth: number;
  lossesMonth: number;
  lowStockCount: number;
  expiringCount: number;
  allocatedAssets: number;
  recentMovements: StockMovement[];
}
