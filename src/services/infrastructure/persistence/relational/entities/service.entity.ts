import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TripDetails } from './trip-details.entity';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';

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

  @OneToOne(() => TripDetails, (details) => details.service, {
    cascade: true, // Automatically save/update/delete details when service is changed
  })
  tripDetails?: TripDetails;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
