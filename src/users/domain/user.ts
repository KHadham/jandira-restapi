import { Exclude, Expose } from 'class-transformer';
import { FileType } from '../../files/domain/file';
import { Role } from '../../roles/domain/role';
import { Status } from '../../statuses/domain/status';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const idType = Number;

export class User {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: String,
    example: 'john.doe@example.com',
  })
  @Expose({ groups: ['me', 'admin'] })
  email: string | null;

  @Exclude({ toPlainOnly: true })
  password?: string;

  @ApiProperty({
    type: String,
    example: 'email',
  })
  @Expose({ groups: ['me', 'admin'] })
  provider: string;

  @ApiProperty({
    type: String,
    example: '1234567890',
  })
  @Expose({ groups: ['me', 'admin'] })
  socialId?: string | null;

  @ApiProperty({
    type: String,
    example: 'John',
  })
  firstName?: string | null;

  @ApiProperty({
    type: String,
    example: 'Doe',
  })
  lastName?: string | null;

  @ApiProperty({
    type: String,
    example: '081234567890',
  })
  @Expose({ groups: ['me', 'admin'] }) // visible to the user themselves or to an admin
  phone: string | null; // Added the phone property

  @Expose({ groups: ['me', 'admin'] }) // Add this line
  @ApiProperty({
    type: () => FileType,
  })
  photo?: FileType | null;

  @ApiPropertyOptional({ example: '123 Travel St, Wanderlust City, World' })
  @Expose({ groups: ['me', 'admin'] }) // Add this line
  address?: string | null | undefined;

  @ApiPropertyOptional({ type: () => FileType })
  @Expose({ groups: ['me', 'admin'] }) // Add this line
  identityPhoto?: FileType | null;

  @ApiPropertyOptional({
    type: Number,
    description: 'Total number of files uploaded by the user.',
  })
  filesCount?: number;

  @ApiProperty({
    type: () => Role,
  })
  role?: Role | null;

  @ApiProperty({
    type: () => Status,
  })
  status?: Status;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  deletedAt: Date;
}
