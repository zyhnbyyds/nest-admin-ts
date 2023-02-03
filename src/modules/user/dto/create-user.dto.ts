export class CreateUserDto {
  userName: string;
  password: string;
  roleId: number;
  avatar: string;
  status: 0 | 1;
  nickName: string;
  email: string;
  phone: string;
}

export class AddUserRoleDto {
  /** 用户id */
  userId: number;
  /** 角色id */
  roleId: number;
}
