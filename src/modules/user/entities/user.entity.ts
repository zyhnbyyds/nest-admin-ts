import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
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
  nickName: string;

  @ManyToOne(() => Role, (role) => role.users)
  role: Role;

  @Column({ nullable: true })
  avatar: string;

  @Column()
  status: 0 | 1;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @CreateDateColumn({ name: 'create_time', nullable: true })
  createTime: Date;

  @UpdateDateColumn({ name: 'update_time', nullable: true })
  updateTime: Date | null;

  @DeleteDateColumn({ name: 'delete_time', nullable: true })
  deleteTime: Date | null;
}
