// User-specific CSV repository implementation

import { CsvRepository } from './CsvRepository';
import { User, UserRepository } from '../interfaces';

export class UserCsvRepository extends CsvRepository<User> implements UserRepository {
  constructor() {
    super('users.csv');
  }

  async getByEmail(email: string): Promise<User | null> {
    const users = await this.findBy({ email });
    return users.length > 0 ? users[0] : null;
  }

  async getByRole(role: User['role']): Promise<User[]> {
    return this.findBy({ role });
  }

  async getByCompany(companyId: string): Promise<User[]> {
    return this.findBy({ company_id: companyId });
  }

  async updateLastLogin(id: string): Promise<void> {
    const now = this.getCurrentTimestamp();
    await this.update(id, { last_login: now });
  }
}