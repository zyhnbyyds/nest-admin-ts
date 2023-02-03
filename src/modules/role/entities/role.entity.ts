import { User } from 'src/modules/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  roleName: string;

  @Column({ type: 'varchar' })
  createdBy: string;

  @Column({ type: 'tinyint' })
  status: number;

  @Column({ nullable: true })
  nickName: string;

  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @CreateDateColumn({ name: 'create_time', nullable: true })
  createTime: Date;

  @UpdateDateColumn({ name: 'update_time', nullable: true })
  updateTime: Date | null;

  @DeleteDateColumn({ name: 'delete_time', nullable: true })
  deleteTime: Date | null;
}
