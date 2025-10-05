import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Service } from 'src/services/infrastructure/persistence/relational/entities/service.entity';
import { Schedule } from 'src/services/infrastructure/persistence/relational/entities/schedule.entity';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async create(createScheduleDto: CreateScheduleDto) {
    const service = await this.serviceRepository.findOneBy({
      id: createScheduleDto.serviceId,
    });

    if (!service) {
      throw new NotFoundException(
        `Service with id #${createScheduleDto.serviceId} not found.`,
      );
    }

    const schedule = this.scheduleRepository.create({
      service: service,
      date: createScheduleDto.date,
      capacity: createScheduleDto.capacity,
    });

    return this.scheduleRepository.save(schedule);
  }

  async update(id: string, updateScheduleDto: UpdateScheduleDto) {
    const schedule = await this.scheduleRepository.findOneBy({ id });

    if (!schedule) {
      throw new NotFoundException(`Schedule with id #${id} not found.`);
    }

    // Business Rule: Prevent capacity reduction below current bookings.
    if (
      updateScheduleDto.capacity &&
      updateScheduleDto.capacity < schedule.bookedCount
    ) {
      throw new BadRequestException(
        `Capacity cannot be reduced below the current number of booked attendees (${schedule.bookedCount}).`,
      );
    }

    Object.assign(schedule, updateScheduleDto);
    return this.scheduleRepository.save(schedule);
  }

  async remove(id: string) {
    const schedule = await this.scheduleRepository.findOneBy({ id });

    if (!schedule) {
      throw new NotFoundException(`Schedule with id #${id} not found.`);
    }

    // Business Rule: Prevent deleting a schedule that has active bookings.
    if (schedule.bookedCount > 0) {
      throw new BadRequestException(
        'Cannot delete a schedule with active bookings. Please cancel the bookings first.',
      );
    }

    await this.scheduleRepository.remove(schedule);
  }

  async findAllForService(serviceId: string) {
    // Get today's date at the beginning of the day (midnight) to ensure we include today's schedules.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.scheduleRepository.find({
      where: {
        service: { id: serviceId },
        isActive: true, // Only show schedules the admin has enabled
        date: MoreThanOrEqual(today), // Only show schedules from today onwards
      },
      order: {
        date: 'ASC', // Order them chronologically
      },
    });
  }
}
