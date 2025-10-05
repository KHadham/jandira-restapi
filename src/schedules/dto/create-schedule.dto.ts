import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({
    description: 'The UUID of the service this schedule belongs to',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({
    description: 'The date for this schedule',
    example: '2025-12-25',
  })
  @Transform(({ value }) => new Date(value))
  @IsDate()
  @IsNotEmpty()
  date: Date;

  @ApiProperty({ description: 'The total capacity for this date', example: 15 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  capacity: number;
}
