export const ONLINE_SESSION_PREFIX = 'online:';
export function onlineSessionKey(userId: number): string {
  return `${ONLINE_SESSION_PREFIX}${userId}`;
}
