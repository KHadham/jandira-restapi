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
import { FileCategoryEnum } from '../../../../domain/file-category.enum';

@Entity({
  name: 'file',
})
export class FileEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  path: string;

  @Column({ type: String, nullable: true }) // <--- ADD THIS LINE
  thumbnailPath?: string | null; // <--- ADD THIS LINE

  @Column({
    type: 'enum',
    enum: FileDriver,
    default: FileDriver.LOCAL,
  })
  driver: FileDriver;

  @Column({
    type: 'enum',
    enum: FileCategoryEnum,
    default: FileCategoryEnum.GENERAL, // Default to OTHER if not specified
  })
  category: FileCategoryEnum;
  // <--- NEW COLUMNS --->
  @Index()
  @Column({ type: 'uuid', nullable: true }) // <--- Change type to 'uuid'
  ownerId?: string | null; // Or make it non-nullable for all new files

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
