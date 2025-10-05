import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { Service } from 'src/services/infrastructure/persistence/relational/entities/service.entity';
import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { Attendee } from './attendee.entity';
import { Schedule } from '../../../../../services/infrastructure/persistence/relational/entities/schedule.entity';
import { FileEntity } from '../../../../../files/infrastructure/persistence/relational/entities/file.entity';

export enum BookingStatusEnum {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Entity({ name: 'booking' })
export class Booking extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => FileEntity, { eager: true, nullable: true }) // <-- Add this relationship
  @JoinColumn() // <-- Add this decorator
  paymentProof?: FileEntity | null;

  // AND CHANGE THESE TWO LINES:
  @ManyToOne(() => UserEntity, { eager: true })
  user: UserEntity;

  @ManyToOne(() => Service, { eager: true })
  service: Service;

  @ManyToOne(() => Schedule, { eager: true }) // <-- ADD THIS RELATION
  schedule: Schedule;

  @Column({
    type: 'enum',
    enum: BookingStatusEnum,
    default: BookingStatusEnum.PENDING_PAYMENT,
  })
  status: BookingStatusEnum;

  @Column({ type: 'int' })
  totalPrice: number; // Final price after calculations/discounts

  @Column({ type: 'int', default: 0 }) // <-- Add this column
  balanceDue: number;

  @OneToMany(() => Attendee, (attendee) => attendee.booking, {
    cascade: true, // <-- This is important! It will auto-save attendees
    eager: true, // <-- Eagerly load attendees with the booking
  })
  attendees: Attendee[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
