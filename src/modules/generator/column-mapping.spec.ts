import { describe, expect, it } from 'vitest';
import {
  drizzleColumn,
  extractLength,
  stripPrefix,
  toCamelCase,
  tsType,
  uniqueColumnImports,
  zodType,
} from './column-mapping';
import type { ColumnMeta } from './column-mapping';

function col(overrides: Partial<ColumnMeta> = {}): ColumnMeta {
  return {
    name: 'name',
    dataType: 'varchar',
    columnType: 'varchar(100)',
    nullable: true,
    primaryKey: false,
    autoIncrement: false,
    defaultValue: null,
    comment: '',
    ...overrides,
  };
}

describe('generator column mapping', () => {
  it('strips the sys_ prefix and camelCases', () => {
    expect(stripPrefix('sys_notice')).toBe('notice');
    expect(toCamelCase('sys_notice')).toBe('sysNotice');
  });

  it('maps column types to TypeScript types', () => {
    expect(tsType(col({ columnType: 'tinyint(1)' }))).toBe('boolean');
    expect(tsType(col({ dataType: 'int', columnType: 'int unsigned' }))).toBe(
      'number',
    );
    expect(tsType(col({ dataType: 'datetime', columnType: 'datetime' }))).toBe(
      'Date',
    );
    expect(tsType(col({ dataType: 'json', columnType: 'json' }))).toBe(
      'unknown',
    );
    expect(
      tsType(col({ dataType: 'varchar', columnType: 'varchar(255)' })),
    ).toBe('string');
  });

  it('maps column types to zod types', () => {
    expect(zodType(col({ dataType: 'int', columnType: 'int unsigned' }))).toBe(
      'z.number().int()',
    );
    expect(
      zodType(col({ dataType: 'varchar', columnType: 'varchar(255)' })),
    ).toBe('z.string()');
    expect(zodType(col({ dataType: 'datetime', columnType: 'datetime' }))).toBe(
      'z.coerce.date()',
    );
  });

  it('extracts length from a column type', () => {
    expect(extractLength('varchar(255)')).toBe(255);
    expect(extractLength('int unsigned')).toBeNull();
  });

  it('builds a drizzle column for an auto-increment primary key', () => {
    expect(
      drizzleColumn(
        col({
          name: 'id',
          dataType: 'int',
          columnType: 'int unsigned',
          autoIncrement: true,
          primaryKey: true,
        }),
      ),
    ).toBe("int('id', { unsigned: true }).autoincrement().primaryKey()");
  });

  it('builds the import list for a column set', () => {
    const imports = uniqueColumnImports([
      col({
        name: 'id',
        dataType: 'int',
        columnType: 'int unsigned',
        autoIncrement: true,
      }),
      col({ dataType: 'varchar', columnType: 'varchar(50)' }),
    ]);
    expect(imports).toContain('mysqlTable');
    expect(imports).toContain('int');
    expect(imports).toContain('varchar');
  });
});
