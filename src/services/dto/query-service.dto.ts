import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryServiceDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}
