import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';

@Entity()
@Tree('closure-table')
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
}
