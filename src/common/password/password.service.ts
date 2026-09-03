/**
 * 密码哈希工具 —— 基于 Bun 运行时内置的 Bun.password（argon2id）。
 *
 * 说明：项目已全面切换至 Bun 运行时（见 package.json engines），不再依赖
 * 第三方 argon2 原生包。Bun.password 产出的哈希是标准 PHC 格式
 * （形如 $argon2id$v=19$m=65536,t=2,p=1$<salt>$<digest>），
 * verify 会从哈希串自解析算法与参数，无需额外配置。
 */

// Bun 是 Bun 运行时注入的全局对象。项目未引入 @types/bun（与 @types/node
// 全局声明冲突），这里仅按需声明用到的 password 子集。
declare const Bun: {
  password: {
    hash(
      password: string,
      options?: { algorithm: 'argon2id' | 'argon2i' | 'bcrypt' | 'scrypt' },
    ): Promise<string>;
    verify(password: string, hash: string): Promise<boolean>;
  };
};

/** argon2id 算法标识常量，对齐旧调用风格 argon2.argon2id */
export const ARGON2ID = 'argon2id' as const;

/** 以 argon2id 生成密码哈希（返回 PHC 格式字符串） */
export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: ARGON2ID });
}

/** 校验明文密码与存储哈希是否匹配 */
export function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return Bun.password.verify(password, hash);
}
