export function legacy<T>(data: T, message = 'success'): { code: number; data: T; message: string } {
  return { code: 200, data, message };
}

export function mapStatus(status: 0 | 1 | '0' | '1' | undefined): 'active' | 'disabled' {
  return status === 1 || status === '1' ? 'disabled' : 'active';
}

export function mapMenuType(type: string | undefined): 'M' | 'C' | 'F' {
  if (type === 'M') return 'C';
  if (type === 'B') return 'F';
  return 'M';
}

export function slugify(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9:_-]+/g, '_').replace(/^_+|_+$/g, '');
  return slug || 'role';
}
