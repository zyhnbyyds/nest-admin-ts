import { Module } from '@nestjs/common';
import { MenusModule } from '../system/menus/menus.module.js';
import { RolesModule } from '../system/roles/roles.module.js';
import { UsersModule } from '../system/users/users.module.js';
import { LegacyMenuController } from './legacy-menu.controller.js';
import { LegacyRoleController } from './legacy-role.controller.js';
import { LegacyUserController } from './legacy-user.controller.js';
@Module({ imports: [MenusModule, UsersModule, RolesModule], controllers: [LegacyMenuController, LegacyUserController, LegacyRoleController] })
export class CompatModule {}
