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
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Service } from 'src/services/infrastructure/persistence/relational/entities/service.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { BookingSummaryDto } from './dto/booking-summary.dto';
import { RoleEnum } from '../roles/roles.enum';
import { User } from '../users/domain/user';
import { QueryBookingDto } from './dto/query-booking.dto';
import { ServiceSummaryDto } from '../services/dto/service-summary.dto';
import { Attendee } from './infrastructure/persistence/relational/entities/attendee.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(UserEntity) // <-- Inject the UserEntity repository
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async cancel(id: string, user: User) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
    });

    // 1. Check if the booking exists
    if (!booking) {
      throw new NotFoundException(`Booking with id #${id} not found.`);
    }

    // 2. Check for ownership or admin role
    const isAdmin = user.role?.id === RoleEnum.admin;
    const isOwner = booking.user.id === user.id;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You are not allowed to modify this booking.',
      );
    }

    // 3. Check if the booking is already in a final state
    if (
      booking.status === BookingStatusEnum.CANCELLED ||
      booking.status === BookingStatusEnum.COMPLETED
    ) {
      throw new BadRequestException(
        `This booking cannot be cancelled as it is already ${booking.status.toLowerCase()}.`,
      );
    }

    // 4. Apply the 3-day rule ONLY for non-admins
    if (!isAdmin) {
      const now = new Date();
      const bookingDate = new Date(booking.bookingDate);

      // Calculate the difference in milliseconds and convert to days
      const diffTime = bookingDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 3) {
        throw new ForbiddenException(
          'Cancellation is only allowed up to 3 days before the booking date.',
        );
      }
    }

    // 5. If all checks pass, update the status and save
    booking.status = BookingStatusEnum.CANCELLED;
    return this.bookingRepository.save(booking);
  }

  async findAll(queryDto: QueryBookingDto, user: User) {
    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Booking> = {};

    // CRITICAL: Filter by user ID if the user is not an admin
    if (user.role?.id !== RoleEnum.admin) {
      where.user = { id: user.id };
    }

    const [items, count] = await this.bookingRepository.findAndCount({
      where,
      skip,
      take: limit,
      relations: {
        service: true, // We need service details to create the summary
      },
      order: {
        createdAt: 'DESC', // Show the newest bookings first
      },
    });

    // Map the full entity to our lightweight summary DTO
    const summaryData = items.map((booking) => {
      const serviceSummary = new ServiceSummaryDto();
      Object.assign(serviceSummary, booking.service);

      const bookingSummary = new BookingSummaryDto();
      // Manually map the properties
      bookingSummary.id = booking.id;
      bookingSummary.bookingDate = booking.bookingDate;
      bookingSummary.status = booking.status;
      bookingSummary.totalPrice = booking.totalPrice;
      bookingSummary.service = serviceSummary;

      // Use the length of the attendees array for the count
      bookingSummary.attendeeCount = booking.attendees
        ? booking.attendees.length
        : 0;

      return bookingSummary;
    });

    return {
      data: summaryData,
      total: count,
      page,
      limit,
    };
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

  async create(createBookingDto: CreateBookingDto, user: UserEntity) {
    const service = await this.serviceRepository.findOneBy({
      id: createBookingDto.serviceId,
    });

    if (!service) {
      throw new NotFoundException(
        `Service with id #${createBookingDto.serviceId} not found.`,
      );
    }

    // 1. Collect all valid emails and phone numbers, filtering out null/undefined values
    const attendeeEmails = createBookingDto.attendees
      .map((a) => a.email)
      .filter((email): email is string => !!email);
    const attendeePhones = createBookingDto.attendees
      .map((a) => a.phone)
      .filter((phone): phone is string => !!phone);

    // 2. Find existing users by email OR phone in one query for efficiency
    const existingUsers = await this.userRepository.find({
      where: [{ email: In(attendeeEmails) }, { phone: In(attendeePhones) }],
    });

    // 3. Create maps for easy lookup
    const usersByEmail = new Map(existingUsers.map((u) => [u.email, u]));
    const usersByPhone = new Map(existingUsers.map((u) => [u.phone, u]));

    // 4. Create Attendee entities
    const attendeeEntities = createBookingDto.attendees.map((attendeeDto) => {
      const attendee = new Attendee();
      attendee.name = attendeeDto.name;
      attendee.email = attendeeDto.email || null;
      attendee.phone = attendeeDto.phone || null;

      // Find a matching user first by email, then by phone
      const foundUser =
        (attendeeDto.email ? usersByEmail.get(attendeeDto.email) : null) ||
        (attendeeDto.phone ? usersByPhone.get(attendeeDto.phone) : null);
      attendee.user = foundUser || null;

      return attendee;
    });

    // 5. Create the Booking
    const booking = this.bookingRepository.create({
      user: user,
      service,
      bookingDate: createBookingDto.bookingDate,
      totalPrice: service.basePrice * createBookingDto.attendees.length,
      attendees: attendeeEntities,
    });

    return this.bookingRepository.save(booking);
  }
}
