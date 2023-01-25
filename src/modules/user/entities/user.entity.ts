import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Length } from 'class-validator';
import { Role } from 'src/modules/role/entities/role.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Length(8, 20)
  userName: string;

  @Column()
  @Length(8, 20)
  password: string;

  @Column({ nullable: true })
  roleName: string;

  @Column({ nullable: true })
  nickName: string;

  @ManyToMany(() => Role, (role) => role.userIds)
  @JoinTable({ name: 'user_role' })
  roleIds: Role[];

  @Column({ nullable: true })
  avatar: string;

  @Column()
  status: 0 | 1;

  @CreateDateColumn({ name: 'create_time', nullable: true })
  createTime: Date;

  @UpdateDateColumn({ name: 'update_time', nullable: true })
  updateTime: Date | null;

  @DeleteDateColumn({ name: 'delete_time', nullable: true })
  deleteTime: Date | null;
}
