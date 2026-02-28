import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restrict a route to specific roles, e.g. @Roles('ADMIN', 'SUPERVISOR') */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
