import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Tree,
  TreeChildren,
  TreeParent,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@Tree('closure-table', {
  ancestorColumnName: (column) => 'ancestor_' + column.propertyName,
  descendantColumnName: (column) => 'descendant_' + column.propertyName,
})
export class Menu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  component: 'basic' | 'blank' | 'multi' | 'self';

  @Column()
  path: string;

  @Column()
  title: string;

  @Column({ type: 'boolean', nullable: true })
  requiresAuth: boolean;

  @Column({ type: 'boolean', nullable: true })
  keepAlive: boolean;

  @Column({ type: 'boolean', nullable: true })
  hide: boolean;

  @Column({ nullable: true })
  href: string;

  @Column('int')
  order: number;

  @Column({ nullable: true })
  icon: string;

  @TreeParent()
  parent: Menu;

  @TreeChildren()
  children: Menu[];

  @Column()
  createBy: string;

  @CreateDateColumn({ name: 'create_time', nullable: true })
  createTime: Date;

  @UpdateDateColumn({ name: 'update_time', nullable: true })
  updateTime: Date | null;

  @DeleteDateColumn({ name: 'delete_time', nullable: true })
  deleteTime: Date | null;
}
