import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateScheduleDto {
  @ApiPropertyOptional({ description: 'The new capacity for this date' })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({
    description: 'Manually toggle if this date is bookable',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
