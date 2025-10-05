import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany, // <-- Import this
} from 'typeorm';
import { TripDetails } from './trip-details.entity';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { Schedule } from './schedule.entity';

export enum ServiceTypeEnum {
  TRIP = 'TRIP',
  RENTAL = 'RENTAL',
  CATERING = 'CATERING',
}

@Entity({ name: 'service' })
export class Service extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int' })
  basePrice: number;

  @Column({ type: 'varchar', nullable: true })
  location?: string;

  @Column({
    type: 'enum',
    enum: ServiceTypeEnum,
  })
  serviceType: ServiceTypeEnum;

  @Column({ type: 'boolean', default: true }) // <-- Add this column
  isBookable: boolean; // Master on/off switch for the whole service

  @OneToOne(() => TripDetails, (details) => details.service, {
    cascade: true,
  })
  tripDetails?: TripDetails;

  @OneToMany(() => Schedule, (schedule) => schedule.service, {
    cascade: true,
  })
  schedules: Schedule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn() // <-- Add this column
  deletedAt: Date;
}
