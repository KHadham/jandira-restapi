import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { Booking } from './booking.entity';
import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

@Entity({ name: 'attendee' })
export class Attendee extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Booking, (booking) => booking.attendees)
  booking: Booking;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true }) // <-- Make email nullable
  email?: string | null;

  @Column({ type: 'varchar', nullable: true }) // <-- Add the new phone column
  phone?: string | null;

  // This is the magic link. It can be null if the attendee is not a registered user.
  @ManyToOne(() => UserEntity, { nullable: true, eager: true })
  user?: UserEntity | null;
}
