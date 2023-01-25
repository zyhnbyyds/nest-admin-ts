export class CreateUserDto {
  userName: string;
  password: string;
  rolesList: string;
  avatar: string;
}

export class AddUserRoleDto {
  /** 用户id */
  userId: number;
  /** 角色id集合 */
  roleIds: string;
}
