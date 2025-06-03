import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne, // <--- Import ManyToOne
  JoinColumn, // <--- Import JoinColumn
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { FileDriver } from '../../../../config/file-config.type';
import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity'; // <--- IMPORT USER ENTITY

@Entity({
  name: 'file',
})
export class FileEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  path: string;

  @Column({
    type: 'enum',
    enum: FileDriver,
    default: FileDriver.LOCAL,
  })
  driver: FileDriver;

  // <--- NEW COLUMNS --->
  @Index()
  @Column({ type: Number, nullable: true }) // Assuming User ID is number. Nullable for now if some old files don't have owners.
  ownerId?: number | null; // Or make it non-nullable for all new files

  @ManyToOne(() => UserEntity, {
    // Optional: Formal relation for referential integrity
    nullable: true, // If ownerId can be null
    onDelete: 'SET NULL', // Or 'CASCADE' or 'RESTRICT' based on your needs
  })
  @JoinColumn({ name: 'ownerId' }) // Specifies the foreign key column
  owner?: UserEntity | null;

  @Column({ type: Boolean, default: false }) // Default new files to private
  isPublic: boolean;
  // <--- END OF NEW COLUMNS --->

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
