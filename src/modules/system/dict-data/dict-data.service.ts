import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, isNull, ne } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { dictionaries, dictTypes } from '../../../database/schema/index';

export type CreateDictDataInput = {
  type: string;
  label: string;
  value: string;
  sort?: number | undefined;
  status?: 'active' | 'disabled' | undefined;
  cssClass?: string | undefined;
  listClass?: string | undefined;
};

export type UpdateDictDataInput = {
  type?: string | undefined;
  label?: string | undefined;
  value?: string | undefined;
  sort?: number | undefined;
  status?: 'active' | 'disabled' | undefined;
  cssClass?: string | null | undefined;
  listClass?: string | null | undefined;
};

@Injectable()
export class DictDataService {
  constructor(private readonly database: DatabaseService) {}

  async list(page: number, pageSize: number, type?: string) {
    const items = await this.database.db
      .select()
      .from(dictionaries)
      .where(
        and(
          isNull(dictionaries.deletedAt),
          type ? eq(dictionaries.type, type) : undefined,
        ),
      )
      .orderBy(asc(dictionaries.sort), asc(dictionaries.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return { items, page, pageSize };
  }

  async byType(type: string) {
    return this.database.db
      .select({
        label: dictionaries.label,
        value: dictionaries.value,
        cssClass: dictionaries.cssClass,
        listClass: dictionaries.listClass,
        sort: dictionaries.sort,
      })
      .from(dictionaries)
      .where(
        and(
          eq(dictionaries.type, type),
          eq(dictionaries.status, 'active'),
          isNull(dictionaries.deletedAt),
        ),
      )
      .orderBy(asc(dictionaries.sort), asc(dictionaries.id));
  }

  async findOne(id: number) {
    const [item] = await this.database.db
      .select()
      .from(dictionaries)
      .where(and(eq(dictionaries.id, id), isNull(dictionaries.deletedAt)))
      .limit(1);
    if (!item) throw new NotFoundException('Dictionary data not found');
    return item;
  }

  async create(
    input: CreateDictDataInput,
    actorId: number,
  ): Promise<{ id: number }> {
    await this.assertTypeExists(input.type);
    await this.assertValueUnique(input.type, input.value);
    const result = await this.database.db.insert(dictionaries).values({
      ...withoutUndefined(input),
      createdBy: actorId,
      updatedBy: actorId,
    });
    return { id: Number(result[0].insertId) };
  }

  async update(
    id: number,
    input: UpdateDictDataInput,
    actorId: number,
  ): Promise<void> {
    const existing = await this.findOne(id);
    const patch = withoutUndefined(input);
    const type = patch.type ?? existing.type;
    const value = patch.value ?? existing.value;
    if (patch.type) await this.assertTypeExists(patch.type);
    if (patch.type || patch.value)
      await this.assertValueUnique(type, value, id);
    const result = await this.database.db
      .update(dictionaries)
      .set({ ...patch, updatedBy: actorId })
      .where(and(eq(dictionaries.id, id), isNull(dictionaries.deletedAt)));
    if (!result[0].affectedRows)
      throw new NotFoundException('Dictionary data not found');
  }

  async remove(id: number, actorId: number): Promise<void> {
    const result = await this.database.db
      .update(dictionaries)
      .set({ deletedAt: new Date(), updatedBy: actorId })
      .where(and(eq(dictionaries.id, id), isNull(dictionaries.deletedAt)));
    if (!result[0].affectedRows)
      throw new NotFoundException('Dictionary data not found');
  }

  private async assertTypeExists(type: string): Promise<void> {
    const [dictType] = await this.database.db
      .select({ id: dictTypes.id })
      .from(dictTypes)
      .where(and(eq(dictTypes.type, type), isNull(dictTypes.deletedAt)))
      .limit(1);
    if (!dictType)
      throw new BadRequestException('Dictionary type does not exist');
  }

  private async assertValueUnique(
    type: string,
    value: string,
    excludeId?: number,
  ): Promise<void> {
    const conditions = [
      eq(dictionaries.type, type),
      eq(dictionaries.value, value),
      isNull(dictionaries.deletedAt),
    ];
    if (excludeId !== undefined)
      conditions.push(ne(dictionaries.id, excludeId));
    const [duplicate] = await this.database.db
      .select({ id: dictionaries.id })
      .from(dictionaries)
      .where(and(...conditions))
      .limit(1);
    if (duplicate)
      throw new ConflictException(
        'Dictionary value already exists for this type',
      );
  }
}

function withoutUndefined<T extends object>(
  value: T,
): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as { [K in keyof T]: Exclude<T[K], undefined> };
}
