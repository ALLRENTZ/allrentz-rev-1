// Company-specific CSV repository implementation

import { CsvRepository } from './CsvRepository';
import { Company, CompanyRepository } from '../interfaces';

export class CompanyCsvRepository extends CsvRepository<Company> implements CompanyRepository {
  constructor() {
    super('companies.csv');
  }

  async getByType(type: 'vendor' | 'customer'): Promise<Company[]> {
    return this.findBy({ type });
  }

  async getByIndustry(industry: string): Promise<Company[]> {
    return this.findBy({ industry });
  }

  async getActiveVendors(): Promise<Company[]> {
    const records = await this.readAll();
    return records.filter(company => 
      company.type === 'vendor' && company.status === 'active'
    );
  }

  async getActiveCustomers(): Promise<Company[]> {
    const records = await this.readAll();
    return records.filter(company => 
      company.type === 'customer' && company.status === 'active'
    );
  }
}