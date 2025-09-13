// Repository Factory - Provides abstraction layer for switching data sources
// Currently uses CSV, will switch to Supabase later without changing business logic

import { 
  CompanyRepository, 
  UserRepository, 
  EquipmentRepository, 
  BookingRepository,
  QuoteRepository,
  ComplianceRepository,
  ComplianceDocumentRepository,
  ServiceTicketRepository
} from './interfaces';

// CSV implementations
import { CompanyCsvRepository } from './csv/CompanyCsvRepository';
import { UserCsvRepository } from './csv/UserCsvRepository';
import { EquipmentCsvRepository } from './csv/EquipmentCsvRepository';
import { BookingCsvRepository } from './csv/BookingCsvRepository';

// Repository configuration
type DataSource = 'csv' | 'supabase';

interface RepositoryConfig {
  dataSource: DataSource;
  // Add Supabase config when ready
  supabaseUrl?: string;
  supabaseKey?: string;
}

class RepositoryFactory {
  private config: RepositoryConfig;
  
  // Singleton instances
  private companyRepo?: CompanyRepository;
  private userRepo?: UserRepository;
  private equipmentRepo?: EquipmentRepository;
  private bookingRepo?: BookingRepository;
  private quoteRepo?: QuoteRepository;
  private complianceRepo?: ComplianceRepository;
  private complianceDocRepo?: ComplianceDocumentRepository;
  private serviceTicketRepo?: ServiceTicketRepository;

  constructor(config: RepositoryConfig) {
    this.config = config;
  }

  // Company Repository
  getCompanyRepository(): CompanyRepository {
    if (!this.companyRepo) {
      switch (this.config.dataSource) {
        case 'csv':
          this.companyRepo = new CompanyCsvRepository();
          break;
        case 'supabase':
          // TODO: Implement when ready
          // this.companyRepo = new CompanySupabaseRepository(this.config);
          throw new Error('Supabase implementation not yet available');
        default:
          throw new Error(`Unknown data source: ${this.config.dataSource}`);
      }
    }
    return this.companyRepo;
  }

  // User Repository
  getUserRepository(): UserRepository {
    if (!this.userRepo) {
      switch (this.config.dataSource) {
        case 'csv':
          this.userRepo = new UserCsvRepository();
          break;
        case 'supabase':
          // TODO: Implement when ready
          throw new Error('Supabase implementation not yet available');
        default:
          throw new Error(`Unknown data source: ${this.config.dataSource}`);
      }
    }
    return this.userRepo;
  }

  // Equipment Repository
  getEquipmentRepository(): EquipmentRepository {
    if (!this.equipmentRepo) {
      switch (this.config.dataSource) {
        case 'csv':
          this.equipmentRepo = new EquipmentCsvRepository();
          break;
        case 'supabase':
          // TODO: Implement when ready
          throw new Error('Supabase implementation not yet available');
        default:
          throw new Error(`Unknown data source: ${this.config.dataSource}`);
      }
    }
    return this.equipmentRepo;
  }

  // Booking Repository
  getBookingRepository(): BookingRepository {
    if (!this.bookingRepo) {
      switch (this.config.dataSource) {
        case 'csv':
          this.bookingRepo = new BookingCsvRepository();
          break;
        case 'supabase':
          // TODO: Implement when ready
          throw new Error('Supabase implementation not yet available');
        default:
          throw new Error(`Unknown data source: ${this.config.dataSource}`);
      }
    }
    return this.bookingRepo;
  }

  // Quote Repository (placeholder for CSV implementation)
  getQuoteRepository(): QuoteRepository {
    if (!this.quoteRepo) {
      switch (this.config.dataSource) {
        case 'csv':
          // TODO: Implement CSV version
          throw new Error('Quote CSV repository not yet implemented');
        case 'supabase':
          // TODO: Implement when ready
          throw new Error('Supabase implementation not yet available');
        default:
          throw new Error(`Unknown data source: ${this.config.dataSource}`);
      }
    }
    return this.quoteRepo;
  }

  // Compliance Repository (placeholder)
  getComplianceRepository(): ComplianceRepository {
    if (!this.complianceRepo) {
      switch (this.config.dataSource) {
        case 'csv':
          // TODO: Implement CSV version
          throw new Error('Compliance CSV repository not yet implemented');
        case 'supabase':
          // TODO: Implement when ready
          throw new Error('Supabase implementation not yet available');
        default:
          throw new Error(`Unknown data source: ${this.config.dataSource}`);
      }
    }
    return this.complianceRepo;
  }

  // Compliance Document Repository (placeholder)
  getComplianceDocumentRepository(): ComplianceDocumentRepository {
    if (!this.complianceDocRepo) {
      switch (this.config.dataSource) {
        case 'csv':
          // TODO: Implement CSV version
          throw new Error('ComplianceDocument CSV repository not yet implemented');
        case 'supabase':
          // TODO: Implement when ready
          throw new Error('Supabase implementation not yet available');
        default:
          throw new Error(`Unknown data source: ${this.config.dataSource}`);
      }
    }
    return this.complianceDocRepo;
  }

  // Service Ticket Repository (placeholder)
  getServiceTicketRepository(): ServiceTicketRepository {
    if (!this.serviceTicketRepo) {
      switch (this.config.dataSource) {
        case 'csv':
          // TODO: Implement CSV version
          throw new Error('ServiceTicket CSV repository not yet implemented');
        case 'supabase':
          // TODO: Implement when ready
          throw new Error('Supabase implementation not yet available');
        default:
          throw new Error(`Unknown data source: ${this.config.dataSource}`);
      }
    }
    return this.serviceTicketRepo;
  }

  // Utility method to reset all repository instances (useful for testing)
  reset(): void {
    this.companyRepo = undefined;
    this.userRepo = undefined;
    this.equipmentRepo = undefined;
    this.bookingRepo = undefined;
    this.quoteRepo = undefined;
    this.complianceRepo = undefined;
    this.complianceDocRepo = undefined;
    this.serviceTicketRepo = undefined;
  }

  // Get current configuration
  getConfig(): RepositoryConfig {
    return { ...this.config };
  }

  // Update configuration (will reset all repository instances)
  updateConfig(newConfig: Partial<RepositoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.reset();
  }
}

// Global repository factory instance
const repositoryFactory = new RepositoryFactory({
  dataSource: 'csv' // Start with CSV, switch to Supabase later
});

export default repositoryFactory;
export { RepositoryFactory, type RepositoryConfig, type DataSource };