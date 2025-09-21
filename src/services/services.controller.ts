import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';

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

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service by ID' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, updateServiceDto);
  }

  @Delete(':id')
  @Roles(RoleEnum.admin) // <-- Only admins can access
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT) // <-- Return a 204 No Content on success
  @ApiOperation({ summary: 'Soft delete a service by ID (Admin only)' })
  softDelete(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.servicesService.softDelete(id);
  }
}
