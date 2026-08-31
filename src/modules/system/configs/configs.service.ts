import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, isNull, ne } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { configs } from '../../../database/schema/index';

export type CreateConfigInput = {
  name: string;
  key: string;
  value: string;
  builtin?: boolean | undefined;
  remark?: string | undefined;
};
export type UpdateConfigInput = {
  name?: string | undefined;
  key?: string | undefined;
  value?: string | undefined;
  builtin?: boolean | undefined;
  remark?: string | null | undefined;
};

@Injectable()
export class ConfigsService {
  constructor(private readonly database: DatabaseService) {}

  async list(page: number, pageSize: number) {
    const items = await this.database.db
      .select()
      .from(configs)
      .where(isNull(configs.deletedAt))
      .orderBy(asc(configs.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return { items, page, pageSize };
  }

  async findOne(id: number) {
    const [config] = await this.database.db
      .select()
      .from(configs)
      .where(and(eq(configs.id, id), isNull(configs.deletedAt)))
      .limit(1);
    if (!config) throw new NotFoundException('参数配置不存在');
    return config;
  }

  async byKey(key: string) {
    const [config] = await this.database.db
      .select()
      .from(configs)
      .where(and(eq(configs.key, key), isNull(configs.deletedAt)))
      .limit(1);
    if (!config) throw new NotFoundException('参数配置不存在');
    return config;
  }

  async create(
    input: CreateConfigInput,
    actorId: number,
  ): Promise<{ id: number }> {
    await this.assertKeyUnique(input.key);
    const result = await this.database.db.insert(configs).values({
      ...withoutUndefined(input),
      createdBy: actorId,
      updatedBy: actorId,
    });
    return { id: Number(result[0].insertId) };
  }

  async update(
    id: number,
    input: UpdateConfigInput,
    actorId: number,
  ): Promise<void> {
    await this.findOne(id);
    const patch = withoutUndefined(input);
    if (patch.key) await this.assertKeyUnique(patch.key, id);
    const result = await this.database.db
      .update(configs)
      .set({ ...patch, updatedBy: actorId })
      .where(and(eq(configs.id, id), isNull(configs.deletedAt)));
    if (!result[0].affectedRows)
      throw new NotFoundException('参数配置不存在');
  }

  async remove(id: number, actorId: number): Promise<void> {
    const config = await this.findOne(id);
    if (config.builtin)
      throw new BadRequestException('内置参数不能删除');
    const result = await this.database.db
      .update(configs)
      .set({ deletedAt: new Date(), updatedBy: actorId })
      .where(and(eq(configs.id, id), isNull(configs.deletedAt)));
    if (!result[0].affectedRows)
      throw new NotFoundException('参数配置不存在');
  }

  private async assertKeyUnique(
    key: string,
    excludeId?: number,
  ): Promise<void> {
    const conditions = [eq(configs.key, key), isNull(configs.deletedAt)];
    if (excludeId !== undefined) conditions.push(ne(configs.id, excludeId));
    const [duplicate] = await this.database.db
      .select({ id: configs.id })
      .from(configs)
      .where(and(...conditions))
      .limit(1);
    if (duplicate) throw new ConflictException('参数键名已存在');
  }
}

function withoutUndefined<T extends object>(
  value: T,
): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as { [K in keyof T]: Exclude<T[K], undefined> };
}
