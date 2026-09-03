/** 以 argon2id 生成密码哈希（返回 PHC 格式字符串） */
export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: 'argon2id' });
}

/** 校验明文密码与存储哈希是否匹配 */
export function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return Bun.password.verify(password, hash);
}
