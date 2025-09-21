import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Service } from './service.entity';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';

// Interfaces for type safety in our JSONB column
export interface ItineraryActivity {
  time: string;
  description: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  activities: ItineraryActivity[];
}

@Entity({ name: 'trip_details' })
export class TripDetails extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  duration: number; // in days

  @Column({ type: 'int' })
  minAttendees: number;

  @Column({ type: 'boolean', default: true })
  isCancellable: boolean;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  itinerary?: ItineraryDay[];

  @Column({
    type: 'text',
    array: true,
    default: [],
  })
  inclusions: string[];

  @Column({
    type: 'text',
    array: true,
    default: [],
  })
  exclusions: string[];

  @OneToOne(() => Service, (service) => service.tripDetails, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  service: Service;
}
