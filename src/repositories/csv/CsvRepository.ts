// CSV-based repository implementation for ALLRENTZ
// This will be replaced with Supabase implementation later

import { promises as fs } from 'fs';
import path from 'path';
import { BaseEntity, Repository, QueryOptions, QueryResult } from '../interfaces';

export class CsvRepository<T extends BaseEntity> implements Repository<T> {
  protected csvPath: string;
  protected headers: string[] = [];

  constructor(csvFileName: string) {
    // Resolve path relative to project root
    this.csvPath = path.resolve(process.cwd(), 'data', csvFileName);
  }

  // Utility method to parse CSV content
  protected parseCsv(content: string): T[] {
    const lines = content.trim().split('\n');
    if (lines.length === 0) return [];

    this.headers = lines[0].split(',');
    const records: T[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === this.headers.length) {
        const record: any = {};
        
        this.headers.forEach((header, index) => {
          const value = values[index];
          
          // Parse JSON fields
          if (value.startsWith('{') && value.endsWith('}')) {
            try {
              record[header] = JSON.parse(value);
            } catch {
              record[header] = value;
            }
          } 
          // Parse numbers
          else if (!isNaN(Number(value)) && value !== '') {
            record[header] = Number(value);
          }
          // Parse booleans
          else if (value === 'true' || value === 'false') {
            record[header] = value === 'true';
          }
          // Keep as string (including empty strings)
          else {
            record[header] = value;
          }
        });
        
        records.push(record as T);
      }
    }

    return records;
  }

  // Utility method to properly parse CSV lines with quoted values
  protected parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quotes
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    values.push(current);
    return values;
  }

  // Utility method to serialize data to CSV
  protected serializeCsv(records: T[]): string {
    if (records.length === 0) return '';

    // Use existing headers or infer from first record with standard ordering
    let headers: string[];
    if (this.headers.length > 0) {
      headers = this.headers;
    } else {
      const firstRecord = records[0] as any;
      // Ensure standard base fields come first
      headers = ['id', 'created_at', 'updated_at'];
      Object.keys(firstRecord).forEach(key => {
        if (!headers.includes(key)) {
          headers.splice(-2, 0, key); // Insert before created_at and updated_at
        }
      });
      headers = headers.filter(h => firstRecord.hasOwnProperty(h));
    }
    const headerLine = headers.join(',');
    
    const dataLines = records.map(record => {
      return headers.map(header => {
        const value = (record as any)[header];
        
        // Serialize objects as JSON
        if (typeof value === 'object' && value !== null) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        
        // Handle strings with commas, quotes, or newlines
        const stringValue = String(value ?? '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      }).join(',');
    });

    return [headerLine, ...dataLines].join('\n');
  }

  // Read all records from CSV
  protected async readAll(): Promise<T[]> {
    try {
      const content = await fs.readFile(this.csvPath, 'utf-8');
      return this.parseCsv(content);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, return empty array
        return [];
      }
      throw error;
    }
  }

  // Write all records to CSV
  protected async writeAll(records: T[]): Promise<void> {
    const csvContent = this.serializeCsv(records);
    
    // Ensure directory exists
    const dir = path.dirname(this.csvPath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(this.csvPath, csvContent, 'utf-8');
  }

  // Generate unique ID
  protected generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get current timestamp
  protected getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  // CRUD Operations Implementation

  async create(entityData: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const records = await this.readAll();
    const now = this.getCurrentTimestamp();
    
    const newEntity: T = {
      ...entityData,
      id: this.generateId(),
      created_at: now,
      updated_at: now,
    } as T;

    records.push(newEntity);
    await this.writeAll(records);
    
    return newEntity;
  }

  async getById(id: string): Promise<T | null> {
    const records = await this.readAll();
    return records.find(record => record.id === id) || null;
  }

  async getAll(options: QueryOptions = {}): Promise<QueryResult<T>> {
    let records = await this.readAll();
    
    // Apply filters
    if (options.filters) {
      records = records.filter(record => {
        return Object.entries(options.filters!).every(([key, value]) => {
          const recordValue = (record as any)[key];
          
          if (Array.isArray(value)) {
            return value.includes(recordValue);
          }
          
          if (typeof value === 'object' && value.operator) {
            switch (value.operator) {
              case 'gt': return recordValue > value.value;
              case 'gte': return recordValue >= value.value;
              case 'lt': return recordValue < value.value;
              case 'lte': return recordValue <= value.value;
              case 'like': return String(recordValue).toLowerCase().includes(String(value.value).toLowerCase());
              default: return recordValue === value.value;
            }
          }
          
          return recordValue === value;
        });
      });
    }

    // Apply sorting
    if (options.sortBy) {
      records.sort((a, b) => {
        const aVal = (a as any)[options.sortBy!];
        const bVal = (b as any)[options.sortBy!];
        
        let result = 0;
        if (aVal < bVal) result = -1;
        else if (aVal > bVal) result = 1;
        
        return options.sortOrder === 'desc' ? -result : result;
      });
    }

    const total = records.length;
    
    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || total;
    const paginatedRecords = records.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      data: paginatedRecords,
      total,
      hasMore
    };
  }

  async update(id: string, updates: Partial<Omit<T, 'id' | 'created_at'>>): Promise<T | null> {
    const records = await this.readAll();
    const index = records.findIndex(record => record.id === id);
    
    if (index === -1) return null;

    const updatedEntity = {
      ...records[index],
      ...updates,
      updated_at: this.getCurrentTimestamp(),
    };

    records[index] = updatedEntity;
    await this.writeAll(records);
    
    return updatedEntity;
  }

  async delete(id: string): Promise<boolean> {
    const records = await this.readAll();
    const initialLength = records.length;
    const filteredRecords = records.filter(record => record.id !== id);
    
    if (filteredRecords.length === initialLength) {
      return false; // Record not found
    }

    await this.writeAll(filteredRecords);
    return true;
  }

  // Bulk operations

  async createMany(entitiesData: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<T[]> {
    const records = await this.readAll();
    const now = this.getCurrentTimestamp();
    
    const newEntities = entitiesData.map(entityData => ({
      ...entityData,
      id: this.generateId(),
      created_at: now,
      updated_at: now,
    } as T));

    records.push(...newEntities);
    await this.writeAll(records);
    
    return newEntities;
  }

  async updateMany(updates: Array<{ id: string; data: Partial<Omit<T, 'id' | 'created_at'>> }>): Promise<T[]> {
    const records = await this.readAll();
    const now = this.getCurrentTimestamp();
    const updatedEntities: T[] = [];

    updates.forEach(({ id, data }) => {
      const index = records.findIndex(record => record.id === id);
      if (index !== -1) {
        const updatedEntity = {
          ...records[index],
          ...data,
          updated_at: now,
        };
        records[index] = updatedEntity;
        updatedEntities.push(updatedEntity);
      }
    });

    if (updatedEntities.length > 0) {
      await this.writeAll(records);
    }
    
    return updatedEntities;
  }

  async deleteMany(ids: string[]): Promise<number> {
    const records = await this.readAll();
    const initialLength = records.length;
    const filteredRecords = records.filter(record => !ids.includes(record.id));
    
    const deletedCount = initialLength - filteredRecords.length;
    
    if (deletedCount > 0) {
      await this.writeAll(filteredRecords);
    }

    return deletedCount;
  }

  // Search and filter methods

  async search(query: string, fields: string[]): Promise<T[]> {
    const records = await this.readAll();
    const searchQuery = query.toLowerCase();
    
    return records.filter(record => {
      return fields.some(field => {
        const value = (record as any)[field];
        return String(value).toLowerCase().includes(searchQuery);
      });
    });
  }

  async findBy(criteria: Partial<T>): Promise<T[]> {
    const records = await this.readAll();
    
    return records.filter(record => {
      return Object.entries(criteria).every(([key, value]) => {
        return (record as any)[key] === value;
      });
    });
  }

  async count(filters?: Record<string, any>): Promise<number> {
    if (!filters) {
      const records = await this.readAll();
      return records.length;
    }

    const result = await this.getAll({ filters });
    return result.total;
  }
}