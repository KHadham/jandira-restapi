import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new service (e.g., a trip)' })
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all services with pagination' })
  findMany(@Query() queryServiceDto: QueryServiceDto) {
    return this.servicesService.findManyWithPagination(queryServiceDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single service by ID' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.servicesService.findOne(id);
  }
}
