import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryBookingDto {
  @ApiPropertyOptional({ description: 'Page number' })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}
