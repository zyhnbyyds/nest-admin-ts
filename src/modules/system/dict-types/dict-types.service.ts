import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, isNull, ne } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { dictionaries, dictTypes } from '../../../database/schema/index';

export type CreateDictTypeInput = {
  name: string;
  type: string;
  status?: 'active' | 'disabled' | undefined;
  remark?: string | undefined;
};
export type UpdateDictTypeInput = {
  name?: string | undefined;
  type?: string | undefined;
  status?: 'active' | 'disabled' | undefined;
  remark?: string | null | undefined;
};

@Injectable()
export class DictTypesService {
  constructor(private readonly database: DatabaseService) {}

  async list(page: number, pageSize: number) {
    const items = await this.database.db
      .select()
      .from(dictTypes)
      .where(isNull(dictTypes.deletedAt))
      .orderBy(asc(dictTypes.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return { items, page, pageSize };
  }

  async findOne(id: number) {
    const [dictType] = await this.database.db
      .select()
      .from(dictTypes)
      .where(and(eq(dictTypes.id, id), isNull(dictTypes.deletedAt)))
      .limit(1);
    if (!dictType) throw new NotFoundException('字典类型不存在');
    return dictType;
  }

  async create(
    input: CreateDictTypeInput,
    actorId: number,
  ): Promise<{ id: number }> {
    await this.assertTypeUnique(input.type);
    const result = await this.database.db.insert(dictTypes).values({
      ...withoutUndefined(input),
      createdBy: actorId,
      updatedBy: actorId,
    });
    return { id: Number(result[0].insertId) };
  }

  async update(
    id: number,
    input: UpdateDictTypeInput,
    actorId: number,
  ): Promise<void> {
    await this.findOne(id);
    const patch = withoutUndefined(input);
    if (patch.type) await this.assertTypeUnique(patch.type, id);
    const result = await this.database.db
      .update(dictTypes)
      .set({ ...patch, updatedBy: actorId })
      .where(and(eq(dictTypes.id, id), isNull(dictTypes.deletedAt)));
    if (!result[0].affectedRows)
      throw new NotFoundException('字典类型不存在');
  }

  async remove(id: number, actorId: number): Promise<void> {
    const dictType = await this.findOne(id);
    await this.database.db.transaction(async (tx) => {
      await tx
        .update(dictionaries)
        .set({ deletedAt: new Date(), updatedBy: actorId })
        .where(
          and(
            eq(dictionaries.type, dictType.type),
            isNull(dictionaries.deletedAt),
          ),
        );
      await tx
        .update(dictTypes)
        .set({ deletedAt: new Date(), updatedBy: actorId })
        .where(and(eq(dictTypes.id, id), isNull(dictTypes.deletedAt)));
    });
  }

  private async assertTypeUnique(
    type: string,
    excludeId?: number,
  ): Promise<void> {
    const conditions = [eq(dictTypes.type, type), isNull(dictTypes.deletedAt)];
    if (excludeId !== undefined) conditions.push(ne(dictTypes.id, excludeId));
    const [duplicate] = await this.database.db
      .select({ id: dictTypes.id })
      .from(dictTypes)
      .where(and(...conditions))
      .limit(1);
    if (duplicate)
      throw new ConflictException('字典类型标识已存在');
  }
}

function withoutUndefined<T extends object>(
  value: T,
): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as { [K in keyof T]: Exclude<T[K], undefined> };
}
