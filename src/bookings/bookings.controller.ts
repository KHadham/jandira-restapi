import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { UpdateAttendeesDto } from './dto/update-attendees.dto';
import { UpdateBookingDateDto } from './dto/update-booking-date.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get a list of bookings' })
  findAll(@Request() request, @Query() queryDto: QueryBookingDto) {
    return this.bookingsService.findAll(queryDto, request.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single booking by ID' })
  findOne(@Request() request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.bookingsService.findOne(id, request.user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new booking (requires login)' })
  create(@Request() request, @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(createBookingDto, request.user);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  cancel(@Request() request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.bookingsService.cancel(id, request.user);
  }

  @Patch(':id/attendees')
  @ApiOperation({ summary: 'Add, update, or remove attendees for a booking' })
  updateAttendees(
    @Request() request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateAttendeesDto: UpdateAttendeesDto,
  ) {
    return this.bookingsService.updateAttendees(
      id,
      updateAttendeesDto,
      request.user,
    );
  }

  @Patch(':id/date')
  @ApiOperation({ summary: 'Change the date of a booking' })
  updateDate(
    @Request() request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateBookingDateDto: UpdateBookingDateDto,
  ) {
    return this.bookingsService.updateDate(
      id,
      updateBookingDateDto,
      request.user,
    );
  }
}
