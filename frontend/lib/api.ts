/**
 * lib/api.ts — Camada de acesso a dados via Supabase
 *
 * Substitui o apiFetch anterior (NestJS REST) por chamadas tipadas ao Supabase.
 * Cada função mapeia diretamente para uma rota/serviço do backend antigo.
 */
import { supabase } from './supabase';
import type {
  Profile,
  Employee,
  Category,
  Item,
  StockMovement,
  DashboardStats,
  MovementType,
} from './supabase';

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw new Error(error.message);
  return data as Profile;
}

// ─── Employees ───────────────────────────────────────────────────────────────

export async function getEmployees(filters?: {
  search?: string;
  sector?: string;
  status?: string;
}): Promise<Employee[]> {
  let query = supabase
    .from('employees')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,registration.ilike.%${filters.search}%,sector.ilike.%${filters.search}%`
    );
  }
  if (filters?.sector) query = query.eq('sector', filters.sector);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Employee[];
}

export async function getEmployee(id: string): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as Employee;
}

export async function createEmployee(payload: Omit<Employee, 'id' | 'is_active' | 'created_at' | 'updated_at'>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Employee;
}

export async function updateEmployee(id: string, payload: Partial<Employee>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Employee;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .update({ is_active: false, status: 'INACTIVE' })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export async function createCategory(payload: Pick<Category, 'name' | 'description'>): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Category;
}

// ─── Items ───────────────────────────────────────────────────────────────────

export async function getItems(filters?: {
  search?: string;
  type?: string;
  categoryId?: string;
  lowStock?: boolean;
}): Promise<Item[]> {
  let query = supabase
    .from('items')
    .select('*, categories(name)')
    .eq('is_active', true)
    .order('name');

  if (filters?.search) query = query.ilike('name', `%${filters.search}%`);
  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters?.lowStock) query = query.lte('quantity', 'min_stock'); // custom filter handled via RPC if needed

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Item[];
}

export async function getItem(id: string): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .select('*, categories(name), employees!current_holder_id(name, registration)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as Item;
}

export async function createItem(payload: Omit<Item, 'id' | 'is_active' | 'created_at' | 'updated_at'>): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Item;
}

export async function updateItem(id: string, payload: Partial<Item>): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Item;
}

// ─── Movements ───────────────────────────────────────────────────────────────

export interface CreateMovementPayload {
  p_type: MovementType;
  p_item_id: string;
  p_employee_id?: string;
  p_quantity: number;
  p_notes?: string;
}

export async function createMovement(payload: CreateMovementPayload): Promise<StockMovement> {
  const { data, error } = await supabase.rpc('create_movement', payload);
  if (error) throw new Error(error.message);
  return data as StockMovement;
}

export async function getMovements(filters?: {
  page?: number;
  limit?: number;
  type?: MovementType;
  itemId?: string;
  employeeId?: string;
}): Promise<{ data: StockMovement[]; total: number }> {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('stock_movements')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.itemId) query = query.eq('item_id', filters.itemId);
  if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as StockMovement[], total: count ?? 0 };
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_dashboard_stats');
  if (error) throw new Error(error.message);
  return data as DashboardStats;
}

// ─── Users/Profiles (ADMIN only) ─────────────────────────────────────────────

export async function getUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}
