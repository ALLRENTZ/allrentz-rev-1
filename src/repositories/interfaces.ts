// Repository interfaces for ALLRENTZ data layer
// These interfaces will remain the same when we migrate from CSV to Supabase

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface QueryResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// Base repository interface
export interface Repository<T extends BaseEntity> {
  // CRUD operations
  create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  getById(id: string): Promise<T | null>;
  getAll(options?: QueryOptions): Promise<QueryResult<T>>;
  update(id: string, updates: Partial<Omit<T, 'id' | 'created_at'>>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  
  // Bulk operations
  createMany(entities: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<T[]>;
  updateMany(updates: Array<{ id: string; data: Partial<Omit<T, 'id' | 'created_at'>> }>): Promise<T[]>;
  deleteMany(ids: string[]): Promise<number>;
  
  // Search and filter
  search(query: string, fields: string[]): Promise<T[]>;
  findBy(criteria: Partial<T>): Promise<T[]>;
  count(filters?: Record<string, any>): Promise<number>;
}

// Company entity and repository
export interface Company extends BaseEntity {
  name: string;
  type: 'vendor' | 'customer';
  status: 'active' | 'inactive' | 'pending';
  headquarters: string;
  founded: number;
  employees: number;
  website: string;
  description: string;
  industry: string;
  revenue_range: string;
  contact_email: string;
  contact_phone: string;
}

export interface CompanyRepository extends Repository<Company> {
  getByType(type: 'vendor' | 'customer'): Promise<Company[]>;
  getByIndustry(industry: string): Promise<Company[]>;
  getActiveVendors(): Promise<Company[]>;
  getActiveCustomers(): Promise<Company[]>;
}

// User entity and repository  
export interface User extends BaseEntity {
  name: string;
  email: string;
  password_hash: string;
  role: 'customer' | 'vendor' | 'admin' | 'manager';
  status: 'active' | 'inactive' | 'pending';
  company_id?: string;
  phone?: string;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    title?: string;
  };
  preferences: {
    notifications: boolean;
    currency: string;
    timezone: string;
  };
  last_login?: string;
}

export interface UserRepository extends Repository<User> {
  getByEmail(email: string): Promise<User | null>;
  getByRole(role: User['role']): Promise<User[]>;
  getByCompany(companyId: string): Promise<User[]>;
  updateLastLogin(id: string): Promise<void>;
}

// Equipment entity and repository
export interface Equipment extends BaseEntity {
  title: string;
  category: string;
  description: string;
  daily_rate: number;
  location: string;
  vendor_id: string;
  specifications: Record<string, any>;
  compliance: {
    certifications: string[];
    safetyRating: string;
    lastInspection: string;
  };
  availability_status: 'available' | 'reserved' | 'maintenance';
  next_available?: string;
  images: Record<string, string>;
}

export interface EquipmentRepository extends Repository<Equipment> {
  getByCategory(category: string): Promise<Equipment[]>;
  getByVendor(vendorId: string): Promise<Equipment[]>;
  getAvailable(): Promise<Equipment[]>;
  searchByLocation(location: string, radiusMiles?: number): Promise<Equipment[]>;
  getByCompliance(certifications: string[]): Promise<Equipment[]>;
  updateAvailability(id: string, status: Equipment['availability_status'], nextAvailable?: string): Promise<Equipment | null>;
}

// Booking entity and repository
export interface Booking extends BaseEntity {
  customer_id: string;
  equipment_id: string;
  vendor_id: string;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  daily_rate: number;
  total_amount: number;
  location: string;
  requirements: Record<string, any>;
  confirmed_at?: string;
}

export interface BookingRepository extends Repository<Booking> {
  getByCustomer(customerId: string): Promise<Booking[]>;
  getByVendor(vendorId: string): Promise<Booking[]>;
  getByEquipment(equipmentId: string): Promise<Booking[]>;
  getByStatus(status: Booking['status']): Promise<Booking[]>;
  getByDateRange(startDate: string, endDate: string): Promise<Booking[]>;
  updateStatus(id: string, status: Booking['status']): Promise<Booking | null>;
  getUpcoming(userId: string, userRole: string): Promise<Booking[]>;
}

// Quote entity and repository
export interface Quote extends BaseEntity {
  customer_id: string;
  equipment_id: string;
  vendor_id: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  start_date: string;
  end_date: string;
  daily_rate: number;
  total_amount: number;
  requirements: Record<string, any>;
  expires_at: string;
  accepted_at?: string;
}

export interface QuoteRepository extends Repository<Quote> {
  getByCustomer(customerId: string): Promise<Quote[]>;
  getByVendor(vendorId: string): Promise<Quote[]>;
  getByStatus(status: Quote['status']): Promise<Quote[]>;
  getExpired(): Promise<Quote[]>;
  acceptQuote(id: string): Promise<Quote | null>;
  rejectQuote(id: string): Promise<Quote | null>;
}

// Compliance entity and repository
export interface ComplianceRequirement extends BaseEntity {
  name: string;
  type: 'certification' | 'inspection' | 'training' | 'permit';
  description: string;
  authority: string; // OSHA, EPA, API, etc.
  renewal_period_days: number;
  mandatory: boolean;
  equipment_categories: string[];
}

export interface ComplianceDocument extends BaseEntity {
  company_id: string;
  requirement_id: string;
  document_type: string;
  file_path: string;
  status: 'valid' | 'expired' | 'pending_renewal' | 'rejected';
  issued_date: string;
  expiry_date?: string;
  verified_by?: string;
  verified_at?: string;
}

export interface ComplianceRepository extends Repository<ComplianceRequirement> {
  getByType(type: ComplianceRequirement['type']): Promise<ComplianceRequirement[]>;
  getByAuthority(authority: string): Promise<ComplianceRequirement[]>;
  getMandatory(): Promise<ComplianceRequirement[]>;
  getForEquipmentCategory(category: string): Promise<ComplianceRequirement[]>;
}

export interface ComplianceDocumentRepository extends Repository<ComplianceDocument> {
  getByCompany(companyId: string): Promise<ComplianceDocument[]>;
  getByRequirement(requirementId: string): Promise<ComplianceDocument[]>;
  getExpiringSoon(days: number): Promise<ComplianceDocument[]>;
  getByStatus(status: ComplianceDocument['status']): Promise<ComplianceDocument[]>;
  updateStatus(id: string, status: ComplianceDocument['status']): Promise<ComplianceDocument | null>;
}

// Service Ticket entity and repository
export interface ServiceTicket extends BaseEntity {
  customer_id: string;
  equipment_id?: string;
  vendor_id?: string;
  booking_id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: 'technical' | 'billing' | 'delivery' | 'maintenance' | 'compliance' | 'other';
  assigned_to?: string;
  resolved_at?: string;
  resolution?: string;
}

export interface ServiceTicketRepository extends Repository<ServiceTicket> {
  getByCustomer(customerId: string): Promise<ServiceTicket[]>;
  getByVendor(vendorId: string): Promise<ServiceTicket[]>;
  getByStatus(status: ServiceTicket['status']): Promise<ServiceTicket[]>;
  getByPriority(priority: ServiceTicket['priority']): Promise<ServiceTicket[]>;
  getOpen(): Promise<ServiceTicket[]>;
  assignTicket(id: string, assignedTo: string): Promise<ServiceTicket | null>;
  resolveTicket(id: string, resolution: string): Promise<ServiceTicket | null>;
}