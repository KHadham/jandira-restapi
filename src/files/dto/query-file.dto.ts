import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { FileCategoryEnum } from '../domain/file-category.enum';

export class FilterFileDto {
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  ownerId?: number;

  @ApiPropertyOptional({ enum: FileCategoryEnum })
  @IsOptional()
  @IsString()
  category?: FileCategoryEnum;
}

export class SortFileDto {
  @ApiPropertyOptional()
  @IsString()
  orderBy: string;

  @ApiPropertyOptional()
  @IsString()
  order: string;
}

export class QueryFileDto {
  @ApiPropertyOptional({
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FilterFileDto)
  filters?: FilterFileDto | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SortFileDto)
  sort?: SortFileDto[] | null;
}
