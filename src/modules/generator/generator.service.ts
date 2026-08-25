import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseService } from '../../database/database.service.js';

export type ColumnMeta = { name: string; dataType: string; columnType: string; nullable: boolean; primaryKey: boolean; autoIncrement: boolean; defaultValue: string | null; comment: string };
export type GeneratedFile = { path: string; content: string };

const AUDIT_COLUMNS = new Set(['id', 'created_at', 'updated_at', 'deleted_at', 'created_by', 'updated_by']);

@Injectable()
export class GeneratorService {
  constructor(private readonly database: DatabaseService) {}

  async listTables(): Promise<Array<{ tableName: string; comment: string; createdAt: Date | null }>> {
    const [rows] = await this.database.pool.query('SELECT table_name AS tableName, table_comment AS comment, create_time AS createdAt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name <> ? ORDER BY table_name', ['__drizzle_migrations']);
    return rows as Array<{ tableName: string; comment: string; createdAt: Date | null }>;
  }

  async getColumns(table: string): Promise<ColumnMeta[]> {
    if (!/^[a-zA-Z0-9_]+$/.test(table)) throw new BadRequestException('Invalid table name');
    const [rows] = await this.database.pool.query('SELECT column_name AS name, data_type AS dataType, column_type AS columnType, is_nullable AS nullable, column_key AS columnKey, column_default AS defaultValue, extra AS extra, column_comment AS comment FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ordinal_position', [table]);
    return (rows as Array<{ name: string; dataType: string; columnType: string; nullable: string; columnKey: string; defaultValue: string | null; extra: string; comment: string }>).map((row) => ({
      name: row.name,
      dataType: row.dataType,
      columnType: row.columnType,
      nullable: row.nullable === 'YES',
      primaryKey: row.columnKey === 'PRI',
      autoIncrement: row.extra.includes('auto_increment'),
      defaultValue: row.defaultValue,
      comment: row.comment ?? '',
    }));
  }

  async preview(table: string): Promise<{ table: string; files: GeneratedFile[] }> {
    const columns = await this.getColumns(table);
    return { table, files: this.buildFiles(table, columns) };
  }

  async generate(table: string, directory: string): Promise<{ table: string; files: GeneratedFile[] }> {
    const columns = await this.getColumns(table);
    const files = this.buildFiles(table, columns);
    const safeDirectory = directory.replace(/[^a-zA-Z0-9_\-/]/g, '');
    const baseDir = path.resolve('src', 'modules', 'generated', safeDirectory);
    await mkdir(baseDir, { recursive: true });
    for (const file of files) {
      await writeFile(path.join(baseDir, path.basename(file.path)), file.content, 'utf8');
    }
    return { table, files };
  }

  private buildFiles(table: string, columns: ColumnMeta[]): GeneratedFile[] {
    const entity = toCamelCase(stripPrefix(table));
    const schema = this.buildSchema(table, columns);
    const service = this.buildService(entity, table, columns);
    const controller = this.buildController(entity, table, columns);
    const module = this.buildModule(entity);
    return [
      { path: `${entity}.schema.ts`, content: schema },
      { path: `${entity}.service.ts`, content: service },
      { path: `${entity}.controller.ts`, content: controller },
      { path: `${entity}.module.ts`, content: module },
    ];
  }

  private buildSchema(table: string, columns: ColumnMeta[]): string {
    const fields = columns.map((col) => `    ${col.name}: ${drizzleColumn(col)},`).join('\n');
    return `import { mysqlTable, ${uniqueColumnImports(columns)} } from 'drizzle-orm/mysql-core';\n\nexport const ${toCamelCase(stripPrefix(table))} = mysqlTable('${table}', {\n${fields}\n});\n`;
  }

  private buildService(entity: string, table: string, columns: ColumnMeta[]): string {
    const writable = columns.filter((col) => !AUDIT_COLUMNS.has(col.name));
    const required = writable.filter((col) => !col.nullable);
    const optional = writable.filter((col) => col.nullable);
    const createType = [...required.map((col) => `${col.name}: ${tsType(col)};`), ...optional.map((col) => `${col.name}?: ${tsType(col)};`)].join(' ');
    const updateType = writable.map((col) => `${col.name}?: ${tsType(col)};`).join(' ');
    return `import { Injectable, NotFoundException } from '@nestjs/common';\nimport { and, desc, eq } from 'drizzle-orm';\nimport { DatabaseService } from '../../../database/database.service.js';\nimport { ${entity} } from '../../../database/schema/index.js';\n\nexport type Create${capitalize(entity)}Input = { ${createType} };\nexport type Update${capitalize(entity)}Input = { ${updateType} };\n\n@Injectable()\nexport class ${capitalize(entity)}Service {\n  constructor(private readonly database: DatabaseService) {}\n  async list(page: number, pageSize: number) {\n    const items = await this.database.db.select().from(${entity}).orderBy(desc(${entity}.id)).limit(pageSize).offset((page - 1) * pageSize);\n    return { items, page, pageSize };\n  }\n  async findOne(id: number) {\n    const [item] = await this.database.db.select().from(${entity}).where(eq(${entity}.id, id)).limit(1);\n    if (!item) throw new NotFoundException('Record not found');\n    return item;\n  }\n  async create(input: Create${capitalize(entity)}Input) {\n    const result = await this.database.db.insert(${entity}).values({ ...input });\n    return { id: Number(result[0].insertId) };\n  }\n  async update(id: number, input: Update${capitalize(entity)}Input) {\n    const result = await this.database.db.update(${entity}).set({ ...withoutUndefined(input) }).where(eq(${entity}.id, id));\n    if (!result[0].affectedRows) throw new NotFoundException('Record not found');\n  }\n  async remove(id: number) {\n    const result = await this.database.db.delete(${entity}).where(eq(${entity}.id, id));\n    if (!result[0].affectedRows) throw new NotFoundException('Record not found');\n  }\n}\nfunction withoutUndefined<T extends object>(value: T): { [K in keyof T]: Exclude<T[K], undefined> } { return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as { [K in keyof T]: Exclude<T[K], undefined> }; }\n`;
  }

  private buildController(entity: string, table: string, columns: ColumnMeta[]): string {
    const writable = columns.filter((col) => !AUDIT_COLUMNS.has(col.name));
    const createFields = writable.map((col) => `${col.name}: ${zodType(col)}${col.nullable ? '.optional()' : ''}`).join(', ');
    const updateFields = writable.map((col) => `${col.name}: ${zodType(col)}.optional()`).join(', ');
    return `import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';\nimport { z } from 'zod';\nimport { RequirePermissions } from '../../../common/auth/permissions.decorator.js';\nimport { ${capitalize(entity)}Service } from './${entity}.service.js';\n\nconst createSchema = z.object({ ${createFields} });\nconst updateSchema = z.object({ ${updateFields} });\n\n@Controller('${table}')\nexport class ${capitalize(entity)}Controller {\n  constructor(private readonly service: ${capitalize(entity)}Service) {}\n  @Get() @RequirePermissions('system:${entity}:list')\n  list(@Query('page') rawPage?: string, @Query('pageSize') rawPageSize?: string) { const page = Math.max(Number(rawPage) || 1, 1); const pageSize = Math.min(Math.max(Number(rawPageSize) || 20, 1), 100); return this.service.list(page, pageSize); }\n  @Get(':id') @RequirePermissions('system:${entity}:list') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }\n  @Post() @RequirePermissions('system:${entity}:create') create(@Body() body: unknown) { return this.service.create(createSchema.parse(body)); }\n  @Patch(':id') @RequirePermissions('system:${entity}:update') update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) { return this.service.update(id, updateSchema.parse(body)); }\n  @Delete(':id') @RequirePermissions('system:${entity}:delete') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }\n}\n`;
  }

  private buildModule(entity: string): string {
    return `import { Module } from '@nestjs/common';\nimport { ${capitalize(entity)}Controller } from './${entity}.controller.js';\nimport { ${capitalize(entity)}Service } from './${entity}.service.js';\n@Module({ controllers: [${capitalize(entity)}Controller], providers: [${capitalize(entity)}Service] })\nexport class ${capitalize(entity)}Module {}\n`;
  }
}

function stripPrefix(table: string): string { return table.replace(/^sys_/, ''); }
function toCamelCase(value: string): string { return value.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase()); }
function capitalize(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1); }

function tsType(col: ColumnMeta): string {
  if (col.columnType === 'tinyint(1)') return 'boolean';
  if (['int', 'bigint', 'smallint', 'mediumint', 'tinyint', 'decimal', 'float', 'double', 'year'].includes(col.dataType)) return 'number';
  if (['datetime', 'date', 'timestamp', 'time'].includes(col.dataType)) return 'Date';
  if (col.dataType === 'json') return 'unknown';
  return 'string';
}

function zodType(col: ColumnMeta): string {
  const type = tsType(col);
  if (type === 'number') return 'z.number().int()';
  if (type === 'boolean') return 'z.boolean()';
  if (type === 'Date') return 'z.coerce.date()';
  if (type === 'unknown') return 'z.unknown()';
  return 'z.string()';
}

function drizzleColumn(col: ColumnMeta): string {
  const base = col.name;
  if (col.autoIncrement) return `int('${base}', { unsigned: true }).autoincrement().primaryKey()`;
  if (col.columnType === 'tinyint(1)') return `boolean('${base}')`;
  if (col.dataType === 'int' || col.dataType === 'bigint' || col.dataType === 'smallint' || col.dataType === 'mediumint' || col.dataType === 'tinyint') return `int('${base}', { unsigned: true })`;
  if (col.dataType === 'decimal' || col.dataType === 'float' || col.dataType === 'double') return `double('${base}')`;
  if (col.dataType === 'datetime') return `datetime('${base}')`;
  if (col.dataType === 'timestamp') return `timestamp('${base}')`;
  if (col.dataType === 'date') return `date('${base}')`;
  if (col.dataType === 'json') return `json('${base}')`;
  if (col.dataType === 'text' || col.dataType === 'longtext' || col.dataType === 'mediumtext') return `text('${base}')`;
  const length = extractLength(col.columnType);
  return length ? `varchar('${base}', { length: ${length} })` : `varchar('${base}', { length: 255 })`;
}

function extractLength(columnType: string): number | null {
  const match = /\((\d+)\)/.exec(columnType);
  return match ? Number(match[1]) : null;
}

function uniqueColumnImports(columns: ColumnMeta[]): string {
  const needed = new Set<string>(['mysqlTable']);
  for (const col of columns) {
    if (col.autoIncrement) needed.add('int');
    else if (col.columnType === 'tinyint(1)') needed.add('boolean');
    else if (['int', 'bigint', 'smallint', 'mediumint', 'tinyint'].includes(col.dataType)) needed.add('int');
    else if (['decimal', 'float', 'double'].includes(col.dataType)) needed.add('double');
    else if (col.dataType === 'datetime') needed.add('datetime');
    else if (col.dataType === 'timestamp') needed.add('timestamp');
    else if (col.dataType === 'date') needed.add('date');
    else if (col.dataType === 'json') needed.add('json');
    else if (['text', 'longtext', 'mediumtext'].includes(col.dataType)) needed.add('text');
    else needed.add('varchar');
  }
  return [...needed].join(', ');
}
