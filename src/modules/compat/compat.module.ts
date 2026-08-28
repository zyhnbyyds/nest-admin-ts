import { Module } from '@nestjs/common';
import { MenusModule } from '../system/menus/menus.module';
import { RolesModule } from '../system/roles/roles.module';
import { UsersModule } from '../system/users/users.module';
import { LegacyMenuController } from './legacy-menu.controller';
import { LegacyRoleController } from './legacy-role.controller';
import { LegacyUserController } from './legacy-user.controller';
@Module({
  imports: [MenusModule, UsersModule, RolesModule],
  controllers: [
    LegacyMenuController,
    LegacyUserController,
    LegacyRoleController,
  ],
})
export class CompatModule {}
