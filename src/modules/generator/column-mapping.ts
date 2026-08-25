export type ColumnMeta = {
  name: string;
  dataType: string;
  columnType: string;
  nullable: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
  defaultValue: string | null;
  comment: string;
};

export function stripPrefix(table: string): string {
  return table.replace(/^sys_/, '');
}

export function toCamelCase(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function tsType(col: ColumnMeta): string {
  if (col.columnType === 'tinyint(1)') return 'boolean';
  if (
    [
      'int',
      'bigint',
      'smallint',
      'mediumint',
      'tinyint',
      'decimal',
      'float',
      'double',
      'year',
    ].includes(col.dataType)
  )
    return 'number';
  if (['datetime', 'date', 'timestamp', 'time'].includes(col.dataType))
    return 'Date';
  if (col.dataType === 'json') return 'unknown';
  return 'string';
}

export function zodType(col: ColumnMeta): string {
  const type = tsType(col);
  if (type === 'number') return 'z.number().int()';
  if (type === 'boolean') return 'z.boolean()';
  if (type === 'Date') return 'z.coerce.date()';
  if (type === 'unknown') return 'z.unknown()';
  return 'z.string()';
}

export function drizzleColumn(col: ColumnMeta): string {
  const base = col.name;
  if (col.autoIncrement)
    return `int('${base}', { unsigned: true }).autoincrement().primaryKey()`;
  if (col.columnType === 'tinyint(1)') return `boolean('${base}')`;
  if (
    col.dataType === 'int' ||
    col.dataType === 'bigint' ||
    col.dataType === 'smallint' ||
    col.dataType === 'mediumint' ||
    col.dataType === 'tinyint'
  )
    return `int('${base}', { unsigned: true })`;
  if (
    col.dataType === 'decimal' ||
    col.dataType === 'float' ||
    col.dataType === 'double'
  )
    return `double('${base}')`;
  if (col.dataType === 'datetime') return `datetime('${base}')`;
  if (col.dataType === 'timestamp') return `timestamp('${base}')`;
  if (col.dataType === 'date') return `date('${base}')`;
  if (col.dataType === 'json') return `json('${base}')`;
  if (
    col.dataType === 'text' ||
    col.dataType === 'longtext' ||
    col.dataType === 'mediumtext'
  )
    return `text('${base}')`;
  const length = extractLength(col.columnType);
  return length
    ? `varchar('${base}', { length: ${length} })`
    : `varchar('${base}', { length: 255 })`;
}

export function extractLength(columnType: string): number | null {
  const match = /\((\d+)\)/.exec(columnType);
  return match ? Number(match[1]) : null;
}

export function uniqueColumnImports(columns: ColumnMeta[]): string {
  const needed = new Set<string>(['mysqlTable']);
  for (const col of columns) {
    if (col.autoIncrement) needed.add('int');
    else if (col.columnType === 'tinyint(1)') needed.add('boolean');
    else if (
      ['int', 'bigint', 'smallint', 'mediumint', 'tinyint'].includes(
        col.dataType,
      )
    )
      needed.add('int');
    else if (['decimal', 'float', 'double'].includes(col.dataType))
      needed.add('double');
    else if (col.dataType === 'datetime') needed.add('datetime');
    else if (col.dataType === 'timestamp') needed.add('timestamp');
    else if (col.dataType === 'date') needed.add('date');
    else if (col.dataType === 'json') needed.add('json');
    else if (['text', 'longtext', 'mediumtext'].includes(col.dataType))
      needed.add('text');
    else needed.add('varchar');
  }
  return [...needed].join(', ');
}
