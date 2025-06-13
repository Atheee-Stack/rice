// rice/libs/_core/infra/src/storage/__tests__/repository.interface.spec.ts
import { Ok } from '@rice/core-kernel';
import { describe, beforeEach, test, expect } from '@jest/globals';
import { InMemoryRepository, TestAggregate, createTestAggregate, TestDomainEvent } from './mock/in-memory-repository.mock';

describe('IRepository', () => {
  let repository: InMemoryRepository<TestAggregate>;

  beforeEach(() => {
    repository = new InMemoryRepository();
  });

  test('findById returns null for non-existent ID', async () => {
    const result = await repository.findById('non-existent');
    expect(result instanceof Ok).toBe(true);
    if (result instanceof Ok) {
      expect(result.value).toBeNull();
    }
  });

  test('exists returns false for non-existent ID', async () => {
    const result = await repository.exists('non-existent');
    expect(result instanceof Ok).toBe(true);
    if (result instanceof Ok) {
      expect(result.value).toBe(false);
    }
  });

  test('save and findById works', async () => {
    const aggregate = createTestAggregate();
    const saveResult = await repository.save(aggregate);
    expect(saveResult instanceof Ok).toBe(true);

    const findResult = await repository.findById(aggregate.id);
    expect(findResult instanceof Ok).toBe(true);

    if (findResult instanceof Ok) {
      const found = findResult.value;
      expect(found).not.toBeNull();
      if (found) {
        expect(found.id).toBe(aggregate.id);
        expect(found.name).toBe("Test");
      }
    }
  });

  test('update existing aggregate', async () => {
    const originalAggregate = createTestAggregate();
    await repository.save(originalAggregate);

    const updatedAggregate = new TestAggregate({
      id: originalAggregate.id,
      name: "Updated"
    });

    const updateResult = await repository.save(updatedAggregate);
    expect(updateResult instanceof Ok).toBe(true);

    const findResult = await repository.findById(originalAggregate.id);
    expect(findResult instanceof Ok).toBe(true);

    if (findResult instanceof Ok) {
      const found = findResult.value;
      expect(found).not.toBeNull();
      if (found) {
        expect(found.name).toBe("Updated");
      }
    }
  });

  test('delete removes aggregate', async () => {
    const aggregate = createTestAggregate();
    await repository.save(aggregate);

    const deleteResult = await repository.delete(aggregate.id);
    expect(deleteResult instanceof Ok).toBe(true);

    const existsResult = await repository.exists(aggregate.id);
    expect(existsResult instanceof Ok).toBe(true);

    if (existsResult instanceof Ok) {
      expect(existsResult.value).toBe(false);
    }
  });

  test('publishEvents clears domain events', async () => {
    const aggregate = createTestAggregate();
    aggregate.addTestEvent(
      new TestDomainEvent(aggregate.id)
    );

    const publishResult = await repository.publishEvents(aggregate);
    expect(publishResult instanceof Ok).toBe(true);
    expect(aggregate.domainEvents.length).toBe(0);
  });

  test('validation fails for empty ID', () => {
    expect(() => {
      new TestAggregate({
        id: "",
        name: "ValidName"
      });
    }).toThrow("ID must be provided");
  });

  test('validation fails for short name', () => {
    expect(() => {
      new TestAggregate({
        id: "valid-id",
        name: "A"
      });
    }).toThrow("must be at least 2 characters");
  });
});