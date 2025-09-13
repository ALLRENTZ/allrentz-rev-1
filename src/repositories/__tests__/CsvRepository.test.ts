import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { CsvRepository } from '../csv/CsvRepository';
import { BaseEntity } from '../interfaces';

// Test entity interface
interface TestEntity extends BaseEntity {
  name: string;
  value: number;
  active: boolean;
  metadata?: Record<string, any>;
}

// Test CSV repository implementation
class TestCsvRepository extends CsvRepository<TestEntity> {
  constructor(filename: string = 'test-entities.csv') {
    super(filename);
  }
}

describe('CsvRepository', () => {
  let repository: TestCsvRepository;
  let testCsvPath: string;

  beforeEach(() => {
    repository = new TestCsvRepository();
    testCsvPath = path.resolve(process.cwd(), 'data', 'test-entities.csv');
  });

  afterEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(testCsvPath);
    } catch (error) {
      // File might not exist, ignore
    }
  });

  describe('Basic CRUD Operations', () => {
    it('should create a new entity', async () => {
      const entityData = {
        name: 'Test Entity',
        value: 42,
        active: true,
        metadata: { key: 'value' }
      };

      const created = await repository.create(entityData);

      expect(created).toMatchObject(entityData);
      expect(created.id).toBeDefined();
      expect(created.created_at).toBeDefined();
      expect(created.updated_at).toBeDefined();
      expect(new Date(created.created_at)).toBeInstanceOf(Date);
    });

    it('should read entity by ID', async () => {
      const entityData = {
        name: 'Test Entity',
        value: 42,
        active: true
      };

      const created = await repository.create(entityData);
      const found = await repository.getById(created.id);

      expect(found).toEqual(created);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.getById('non-existent-id');
      expect(found).toBeNull();
    });

    it('should update an entity', async () => {
      const entityData = {
        name: 'Test Entity',
        value: 42,
        active: true
      };

      const created = await repository.create(entityData);
      const updates = { name: 'Updated Entity', value: 99 };
      const updated = await repository.update(created.id, updates);

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated Entity');
      expect(updated?.value).toBe(99);
      expect(updated?.active).toBe(true); // Unchanged
      expect(updated?.updated_at).not.toBe(created.updated_at);
    });

    it('should delete an entity', async () => {
      const entityData = {
        name: 'Test Entity',
        value: 42,
        active: true
      };

      const created = await repository.create(entityData);
      const deleted = await repository.delete(created.id);
      const found = await repository.getById(created.id);

      expect(deleted).toBe(true);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent entity', async () => {
      const deleted = await repository.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('Bulk Operations', () => {
    it('should create multiple entities', async () => {
      const entitiesData = [
        { name: 'Entity 1', value: 1, active: true },
        { name: 'Entity 2', value: 2, active: false },
        { name: 'Entity 3', value: 3, active: true }
      ];

      const created = await repository.createMany(entitiesData);

      expect(created).toHaveLength(3);
      created.forEach((entity, index) => {
        expect(entity).toMatchObject(entitiesData[index]);
        expect(entity.id).toBeDefined();
      });
    });

    it('should update multiple entities', async () => {
      const entitiesData = [
        { name: 'Entity 1', value: 1, active: true },
        { name: 'Entity 2', value: 2, active: false }
      ];

      const created = await repository.createMany(entitiesData);
      const updates = [
        { id: created[0].id, data: { value: 10 } },
        { id: created[1].id, data: { name: 'Updated Entity 2' } }
      ];

      const updated = await repository.updateMany(updates);

      expect(updated).toHaveLength(2);
      expect(updated[0].value).toBe(10);
      expect(updated[1].name).toBe('Updated Entity 2');
    });

    it('should delete multiple entities', async () => {
      const entitiesData = [
        { name: 'Entity 1', value: 1, active: true },
        { name: 'Entity 2', value: 2, active: false },
        { name: 'Entity 3', value: 3, active: true }
      ];

      const created = await repository.createMany(entitiesData);
      const idsToDelete = [created[0].id, created[2].id];
      const deletedCount = await repository.deleteMany(idsToDelete);

      expect(deletedCount).toBe(2);
      
      const remaining = await repository.getAll();
      expect(remaining.data).toHaveLength(1);
      expect(remaining.data[0].id).toBe(created[1].id);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Set up test data
      const testData = [
        { name: 'Alpha', value: 10, active: true },
        { name: 'Beta', value: 20, active: false },
        { name: 'Gamma', value: 30, active: true },
        { name: 'Delta', value: 40, active: false },
        { name: 'Epsilon', value: 50, active: true }
      ];
      await repository.createMany(testData);
    });

    it('should get all entities', async () => {
      const result = await repository.getAll();
      
      expect(result.data).toHaveLength(5);
      expect(result.total).toBe(5);
      expect(result.hasMore).toBe(false);
    });

    it('should support pagination', async () => {
      const page1 = await repository.getAll({ limit: 2, offset: 0 });
      const page2 = await repository.getAll({ limit: 2, offset: 2 });
      
      expect(page1.data).toHaveLength(2);
      expect(page1.hasMore).toBe(true);
      expect(page1.total).toBe(5);
      
      expect(page2.data).toHaveLength(2);
      expect(page2.hasMore).toBe(true);
      expect(page2.total).toBe(5);
      
      // Ensure different records
      expect(page1.data[0].id).not.toBe(page2.data[0].id);
    });

    it('should support sorting', async () => {
      const ascending = await repository.getAll({ 
        sortBy: 'value', 
        sortOrder: 'asc' 
      });
      
      const descending = await repository.getAll({ 
        sortBy: 'value', 
        sortOrder: 'desc' 
      });

      expect(ascending.data[0].value).toBe(10);
      expect(ascending.data[4].value).toBe(50);
      
      expect(descending.data[0].value).toBe(50);
      expect(descending.data[4].value).toBe(10);
    });

    it('should support filtering', async () => {
      const activeEntities = await repository.getAll({
        filters: { active: true }
      });
      
      const highValueEntities = await repository.getAll({
        filters: { 
          value: { operator: 'gte', value: 30 } 
        }
      });

      expect(activeEntities.data).toHaveLength(3);
      activeEntities.data.forEach(entity => {
        expect(entity.active).toBe(true);
      });

      expect(highValueEntities.data).toHaveLength(3);
      highValueEntities.data.forEach(entity => {
        expect(entity.value).toBeGreaterThanOrEqual(30);
      });
    });

    it('should support search', async () => {
      const searchResults = await repository.search('lph', ['name']);
      
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('Alpha');
    });

    it('should support findBy criteria', async () => {
      const found = await repository.findBy({ active: true });
      
      expect(found).toHaveLength(3);
      found.forEach(entity => {
        expect(entity.active).toBe(true);
      });
    });

    it('should count entities with filters', async () => {
      const totalCount = await repository.count();
      const activeCount = await repository.count({ active: true });
      
      expect(totalCount).toBe(5);
      expect(activeCount).toBe(3);
    });
  });

  describe('CSV Parsing', () => {
    it('should handle JSON fields correctly', async () => {
      const entityData = {
        name: 'JSON Test',
        value: 42,
        active: true,
        metadata: { 
          nested: { key: 'value' },
          array: [1, 2, 3],
          boolean: true 
        }
      };

      const created = await repository.create(entityData);
      const found = await repository.getById(created.id);

      expect(found?.metadata).toEqual(entityData.metadata);
    });

    it.skip('should handle CSV special characters', async () => {
      // TODO: Implement proper multi-line CSV parsing
      const entityData = {
        name: 'Test, with "quotes" and \nnewlines',
        value: 42,
        active: true
      };

      const created = await repository.create(entityData);
      const found = await repository.getById(created.id);

      expect(found?.name).toBe(entityData.name);
    });

    it('should handle empty values correctly', async () => {
      const entityData = {
        name: '',
        value: 0,
        active: false
      };

      const created = await repository.create(entityData);
      const found = await repository.getById(created.id);

      expect(found?.name).toBe('');
      expect(found?.value).toBe(0);
      expect(found?.active).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent CSV file gracefully', async () => {
      const nonExistentRepo = new TestCsvRepository('non-existent.csv');
      const result = await nonExistentRepo.getAll();
      
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return null for update on non-existent entity', async () => {
      const result = await repository.update('non-existent-id', { name: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('CSV File Format', () => {
    it('should create valid CSV header', async () => {
      const entityData = {
        name: 'Test Entity',
        value: 42,
        active: true
      };

      await repository.create(entityData);
      
      const csvContent = await fs.readFile(testCsvPath, 'utf-8');
      const lines = csvContent.trim().split('\n');
      
      expect(lines[0]).toContain('id,name,value,active');
      expect(lines).toHaveLength(2); // Header + 1 data row
    });

    it('should maintain CSV format after multiple operations', async () => {
      const entitiesData = [
        { name: 'Entity 1', value: 1, active: true },
        { name: 'Entity 2', value: 2, active: false }
      ];

      const created = await repository.createMany(entitiesData);
      await repository.update(created[0].id, { value: 99 });
      await repository.delete(created[1].id);
      
      const csvContent = await fs.readFile(testCsvPath, 'utf-8');
      const lines = csvContent.trim().split('\n');
      
      expect(lines).toHaveLength(2); // Header + 1 remaining row
      expect(lines[1]).toContain('99'); // Updated value
    });
  });
});