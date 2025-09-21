import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Service } from './infrastructure/persistence/relational/entities/service.entity';
import { Repository } from 'typeorm';
import { CreateServiceDto } from './dto/create-service.dto';
import { TripDetails } from './infrastructure/persistence/relational/entities/trip-details.entity';
import { QueryServiceDto } from './dto/query-service.dto';
import { ServiceSummaryDto } from './dto/service-summary.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async create(createServiceDto: CreateServiceDto) {
    // We only handle TRIP type for now as per our focus
    if (createServiceDto.serviceType === 'TRIP') {
      const tripDetails = new TripDetails();
      Object.assign(tripDetails, createServiceDto.tripDetails);

      const service = new Service();
      Object.assign(service, createServiceDto);
      service.tripDetails = tripDetails; // Assign the nested details

      return this.serviceRepository.save(service);
    }

    // In the future, you can add logic for RENTAL, CATERING, etc.
    // throw new BadRequestException('Service type not supported yet.');
  }
  async findManyWithPagination(queryServiceDto: QueryServiceDto) {
    const page = queryServiceDto.page ?? 1;
    const limit = queryServiceDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [items, count] = await this.serviceRepository.findAndCount({
      skip,
      take: limit,
      // NOTE: We REMOVED the 'relations' part to avoid loading heavy details.
    });

    //  add how many days
    const summaryData = items.map((service) => {
      const summary = new ServiceSummaryDto();
      summary.id = service.id;
      summary.title = service.title;
      summary.basePrice = service.basePrice;
      summary.location = service.location;
      summary.serviceType = service.serviceType;
      return summary;
    });

    return {
      data: summaryData, // Return the mapped summary data
      total: count,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: {
        tripDetails: true,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with id #${id} not found.`);
    }

    return service;
  }

  async update(
    id: string,
    updateServiceDto: UpdateServiceDto,
  ): Promise<Service> {
    // Step 1: Load the existing service WITH its relations
    const existingService = await this.serviceRepository.findOne({
      where: { id },
      relations: {
        tripDetails: true,
      },
    });

    if (!existingService) {
      throw new NotFoundException(`Service with id #${id} not found.`);
    }

    // Step 2: Separate the main DTO from the nested details DTO
    const { tripDetails: tripDetailsDto, ...mainServiceData } =
      updateServiceDto;

    // Step 3: Update the top-level properties (title, price, etc.)
    Object.assign(existingService, mainServiceData);

    // Step 4: CRITICAL - Only update tripDetails if they were actually provided in the payload
    if (tripDetailsDto && existingService.tripDetails) {
      Object.assign(existingService.tripDetails, tripDetailsDto);
    }

    // Step 5: Save the updated entity. TypeORM will figure out what changed.
    return this.serviceRepository.save(existingService);
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.serviceRepository.softDelete(id);

    if (!result.affected) {
      throw new NotFoundException(`Service with id #${id} not found.`);
    }
  }
}
