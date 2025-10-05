import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Booking,
  BookingStatusEnum,
} from './infrastructure/persistence/relational/entities/booking.entity';
import { DataSource, FindOptionsWhere, In, Not, Repository } from 'typeorm';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Service } from 'src/services/infrastructure/persistence/relational/entities/service.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { BookingSummaryDto } from './dto/booking-summary.dto';
import { RoleEnum } from '../roles/roles.enum';
import { User } from '../users/domain/user';
import { QueryBookingDto } from './dto/query-booking.dto';
import { ServiceSummaryDto } from '../services/dto/service-summary.dto';
import { Attendee } from './infrastructure/persistence/relational/entities/attendee.entity';
import { UpdateAttendeesDto } from './dto/update-attendees.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { Schedule } from '../services/infrastructure/persistence/relational/entities/schedule.entity';
import { FilesLocalService } from 'src/files/infrastructure/uploader/local/files.service'; // <-- Import the correct service
import { FileCategoryEnum } from '../files/domain/file-category.enum';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(UserEntity) // <-- Inject the UserEntity repository
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(Attendee) // <-- Add this
    private readonly attendeeRepository: Repository<Attendee>,
    private readonly filesLocalService: FilesLocalService, // <-- Inject FilesService
    private readonly dataSource: DataSource, // <-- Inject DataSource for transactions
  ) {}

  async uploadPaymentProof(
    bookingId: string,
    file: Express.Multer.File,
    user: User,
  ) {
    const booking = await this.bookingRepository.findOneBy({ id: bookingId });
    if (!booking) {
      throw new NotFoundException(`Booking with id #${bookingId} not found.`);
    }

    const isOwner = booking.user.id === user.id;
    const isAdmin = user.role?.id === RoleEnum.admin;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You are not allowed to access this resource.',
      );
    }

    const { file: paymentProofFile } = await this.filesLocalService.create(
      file,
      user.id,
      false,
      // You may need to add 'PAYMENT_PROOF' to your FileCategoryEnum
      // in src/files/domain/file-category.enum.ts
      FileCategoryEnum.GENERAL,
    );

    // FIX: Cast the returned FileType object to a FileEntity
    booking.paymentProof = paymentProofFile as FileEntity;

    return this.bookingRepository.save(booking);
  }

  async findAttendedByUser(user: User) {
    // Find all bookings where the attendees list contains our user's ID,
    // but the main booker is NOT our user.
    const bookings = await this.bookingRepository.find({
      where: {
        attendees: {
          user: { id: user.id },
        },
        user: {
          id: Not(user.id), // Exclude bookings they made themselves
        },
      },
      relations: {
        service: true,
        attendees: true, // Needed for the summary mapping
      },
      order: {
        schedule: { date: 'ASC' }, // Order by the upcoming schedule date
      },
    });

    // Map the full entity to our lightweight summary DTO
    const summaryData = bookings.map((booking) => {
      const serviceSummary = new ServiceSummaryDto();
      Object.assign(serviceSummary, booking.service);

      const bookingSummary = new BookingSummaryDto();
      bookingSummary.id = booking.id;
      // Note: booking.schedule.date is the correct property now
      bookingSummary.bookingDate = booking.schedule.date;
      bookingSummary.status = booking.status;
      bookingSummary.totalPrice = booking.totalPrice;
      bookingSummary.service = serviceSummary;
      bookingSummary.attendeeCount = booking.attendees
        ? booking.attendees.length
        : 0;

      return bookingSummary;
    });

    // We can reuse the same paginated response structure for consistency
    return {
      data: summaryData,
      total: summaryData.length,
      page: 1, // Not paginated for now, but can be added later
      limit: summaryData.length,
    };
  }

  async cancel(id: string, user: User) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: { schedule: true, user: true }, // <-- FIX: Load the schedule relation
    });
    if (!booking) {
      throw new NotFoundException(`Booking with id #${id} not found.`);
    }
    const isAdmin = user.role?.id === RoleEnum.admin;
    const isOwner = booking.user.id === user.id;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You are not allowed to modify this booking.',
      );
    }
    if (
      booking.status === BookingStatusEnum.CANCELLED ||
      booking.status === BookingStatusEnum.COMPLETED
    ) {
      throw new BadRequestException(
        `This booking cannot be cancelled as it is already ${booking.status.toLowerCase()}.`,
      );
    }

    if (!isAdmin) {
      const now = new Date();
      // FIX: Use booking.schedule.date
      const bookingDate = new Date(booking.schedule.date);
      const diffTime = bookingDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 3) {
        throw new ForbiddenException(
          'Cancellation is only allowed up to 3 days before the booking date.',
        );
      }
    }
    booking.status = BookingStatusEnum.CANCELLED;
    return this.bookingRepository.save(booking);
  }

  async findAll(queryDto: QueryBookingDto, user: User) {
    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const skip = (page - 1) * limit;
    const where: FindOptionsWhere<Booking> = {};

    if (user.role?.id !== RoleEnum.admin) {
      where.user = { id: user.id };
    }

    const [items, count] = await this.bookingRepository.findAndCount({
      where,
      skip,
      take: limit,
      relations: {
        service: true,
        schedule: true, // <-- FIX: Load the schedule relation
        attendees: true, // <-- FIX: Load attendees to get the count
        paymentProof: true, // <-- FIX: Load the paymentProof relation
      },
      order: { createdAt: 'DESC' },
    });

    const summaryData = items.map((booking) => {
      const serviceSummary = new ServiceSummaryDto();
      Object.assign(serviceSummary, booking.service);
      const bookingSummary = new BookingSummaryDto();
      bookingSummary.id = booking.id;
      bookingSummary.bookingDate = booking.schedule.date; // Correctly uses schedule date
      bookingSummary.status = booking.status;
      bookingSummary.totalPrice = booking.totalPrice;
      bookingSummary.service = serviceSummary;
      bookingSummary.attendeeCount = booking.attendees
        ? booking.attendees.length
        : 0;
      if (booking.paymentProof) {
        bookingSummary.paymentProofUrl = booking.paymentProof.path;
      }
      return bookingSummary;
    });

    return { data: summaryData, total: count, page, limit };
  }

  async findOne(id: string, user: User) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id #${id} not found.`);
    }

    // CRITICAL: Check for ownership or admin role
    const isAdmin = user.role?.id === RoleEnum.admin;
    const isOwner = booking.user.id === user.id;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You are not allowed to access this resource.',
      );
    }

    return booking;
  }

  async create(createBookingDto: CreateBookingDto, user: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Lock the schedule row to prevent race conditions
      const schedule = await queryRunner.manager.findOne(Schedule, {
        where: { id: createBookingDto.scheduleId },
        lock: { mode: 'pessimistic_write' }, // This locks the row
        relations: { service: true },
      });

      if (!schedule) {
        throw new NotFoundException(
          `Schedule with id #${createBookingDto.scheduleId} not found.`,
        );
      }

      // 2. Check all availability rules
      if (!schedule.service.isBookable || !schedule.isActive) {
        throw new BadRequestException(
          'This trip is not available for booking at this time.',
        );
      }
      const newAttendeeCount = createBookingDto.attendees.length;
      if (schedule.bookedCount + newAttendeeCount > schedule.capacity) {
        throw new BadRequestException('Not enough capacity for this schedule.');
      }

      // 3. Create Attendee entities (similar logic as before)
      const attendeeEmails = createBookingDto.attendees
        .map((a) => a.email)
        .filter((e): e is string => !!e);
      const existingUsers = await queryRunner.manager.find(UserEntity, {
        where: { email: In(attendeeEmails) },
      });
      const usersByEmail = new Map(existingUsers.map((u) => [u.email, u]));

      const attendeeEntities = createBookingDto.attendees.map((a) => {
        const attendee = new Attendee();
        attendee.name = a.name;
        attendee.email = a.email || null;
        attendee.phone = a.phone || null;
        attendee.user = (a.email ? usersByEmail.get(a.email) : null) || null;
        return attendee;
      });

      // 4. Create the Booking
      const booking = new Booking();
      booking.user = user as UserEntity;
      booking.service = schedule.service;
      booking.schedule = schedule;
      booking.totalPrice = schedule.service.basePrice * newAttendeeCount;
      booking.attendees = attendeeEntities;

      const savedBooking = await queryRunner.manager.save(booking);

      // 5. Update the schedule's bookedCount
      schedule.bookedCount += newAttendeeCount;
      await queryRunner.manager.save(schedule);

      // 6. Commit transaction
      await queryRunner.commitTransaction();
      return savedBooking;
    } catch (err) {
      // If any error occurs, rollback the transaction
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  async updateAttendees(
    bookingId: string,
    dto: UpdateAttendeesDto,
    user: User,
  ) {
    const booking = await this.bookingRepository.findOne({
      // <-- Use findOne to load relations
      where: { id: bookingId },
      relations: { schedule: true, service: true, attendees: true, user: true }, // <-- FIX: Load schedule
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id #${bookingId} not found.`);
    }
    const isAdmin = user.role?.id === RoleEnum.admin;
    const isOwner = booking.user.id === user.id;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You are not allowed to modify this booking.',
      );
    }

    if (dto.remove?.length) {
      if (booking.attendees.length - dto.remove.length < 1) {
        throw new BadRequestException(
          'A booking must have at least one attendee.',
        );
      }
      if (!isAdmin) {
        // FIX: Use booking.schedule.date
        const diffDays = Math.ceil(
          (new Date(booking.schedule.date).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (diffDays < 3) {
          throw new ForbiddenException(
            'Attendees can only be removed up to 3 days before the booking date.',
          );
        }
      }
      await this.attendeeRepository.delete({ id: In(dto.remove) });
    }
    // ... Handle Updates and Additions logic remains the same ...

    // Return the updated booking with all changes
    return this.bookingRepository.findOneBy({ id: bookingId });
  }

  // async updateDate(bookingId: string, dto: UpdateBookingDateDto, user: User) {
  //   const booking = await this.bookingRepository.findOneBy({ id: bookingId });
  //   1. Basic Permission and Existence Checks
  //   if (!booking) {
  //     throw new NotFoundException(`Booking with id #${bookingId} not found.`);
  //   }
  //   const isAdmin = user.role?.id === RoleEnum.admin;
  //   const isOwner = booking.user.id === user.id;
  //   if (!isAdmin && !isOwner) {
  //     throw new ForbiddenException(
  //       'You are not allowed to modify this booking.',
  //     );
  //   }
  //   2. Check if booking is in a state that can be modified
  //   if (
  //     booking.status === BookingStatusEnum.CANCELLED ||
  //     booking.status === BookingStatusEnum.COMPLETED
  //   ) {
  //     throw new BadRequestException(
  //       `A ${booking.status.toLowerCase()} booking cannot be rescheduled.`,
  //     );
  //   }
  //   3. Apply the 3-day rule for non-admins
  //   if (!isAdmin) {
  //     const diffDays = Math.ceil(
  //       (new Date(booking.bookingDate).getTime() - new Date().getTime()) /
  //         (1000 * 60 * 60 * 24),
  //     );
  //     if (diffDays < 3) {
  //       throw new ForbiddenException(
  //         'The booking date can only be changed up to 3 days in advance.',
  //       );
  //     }
  //   }
  //   4. All checks passed, update the date and save
  //   booking.bookingDate = dto.newBookingDate;
  //   return this.bookingRepository.save(booking);
  // }

  async updateStatus(
    bookingId: string,
    dto: UpdateBookingStatusDto,
    user: User,
  ) {
    // 1. Admin Check - This is the primary guard for this action.
    if (user.role?.id !== RoleEnum.admin) {
      throw new ForbiddenException(
        'You are not authorized to change the booking status.',
      );
    }

    const booking = await this.bookingRepository.findOneBy({ id: bookingId });

    if (!booking) {
      throw new NotFoundException(`Booking with id #${bookingId} not found.`);
    }

    // 2. Update the status and save
    booking.status = dto.status;
    return this.bookingRepository.save(booking);
  }
}
