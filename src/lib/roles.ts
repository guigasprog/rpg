// Papéis de usuário. SQLite não tem enums no Prisma, então validamos aqui.
export const ROLES = {
  MASTER: "MASTER",
  PLAYER: "PLAYER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function isRole(value: unknown): value is Role {
  return value === ROLES.MASTER || value === ROLES.PLAYER;
}

export function isMaster(role: unknown): boolean {
  return role === ROLES.MASTER;
}
