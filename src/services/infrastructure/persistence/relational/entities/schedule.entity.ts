import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { Service } from './service.entity';

@Entity({ name: 'schedule' })
export class Schedule extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Service, (service) => service.schedules)
  service: Service;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'int', default: 0 })
  bookedCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Admin's manual on/off switch for a date

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
