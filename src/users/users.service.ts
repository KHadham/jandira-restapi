import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { NullableType } from '../utils/types/nullable.type';
import { FilterUserDto, SortUserDto } from './dto/query-user.dto';
import { UserRepository } from './infrastructure/persistence/user.repository';
import { User } from './domain/user';
import bcrypt from 'bcryptjs';
import { AuthProvidersEnum } from '../auth/auth-providers.enum';
import { FilesService } from '../files/files.service';
import { RoleEnum } from '../roles/roles.enum';
import { StatusEnum } from '../statuses/statuses.enum';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { FileType } from '../files/domain/file';
import { Role } from '../roles/domain/role';
import { Status } from '../statuses/domain/status';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UserRepository,
    private readonly filesService: FilesService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Do not remove comment below.
    // <creating-property />

    let password: string | undefined = undefined;

    if (createUserDto.password) {
      const salt = await bcrypt.genSalt();
      password = await bcrypt.hash(createUserDto.password, salt);
    }

    let email: string | null = null;

    if (createUserDto.email) {
      const userObject = await this.usersRepository.findByEmail(
        createUserDto.email,
      );
      if (userObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailAlreadyExists',
          },
        });
      }
      email = createUserDto.email.toLowerCase().trim(); // Keep cleansing
    }

    let phone: string | null = null;
    if (createUserDto.phone) {
      // const userObject = await this.usersRepository.findByPhone(
      //   createUserDto.phone,
      // );
      // if (userObject) {
      //   throw new UnprocessableEntityException({
      //     status: HttpStatus.UNPROCESSABLE_ENTITY,
      //     errors: {
      //       phone: 'phoneAlreadyExists',
      //     },
      //   });
      // }
      phone = createUserDto.phone;
    }

    let photo: FileType | null | undefined = undefined;

    if (createUserDto.photo?.id) {
      const fileObject = await this.filesService.findById(
        createUserDto.photo.id,
      );
      if (!fileObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            photo: 'imageNotExists',
          },
        });
      }
      photo = fileObject;
    } else if (createUserDto.photo === null) {
      photo = null;
    }

    let role: Role | undefined = undefined;

    if (createUserDto.role?.id) {
      const roleObject = Object.values(RoleEnum)
        .map(String)
        .includes(String(createUserDto.role.id));
      if (!roleObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            role: 'roleNotExists',
          },
        });
      }

      role = {
        id: createUserDto.role.id,
      };
    }

    let status: Status | undefined = undefined;

    if (createUserDto.status?.id) {
      const statusObject = Object.values(StatusEnum)
        .map(String)
        .includes(String(createUserDto.status.id));
      if (!statusObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            status: 'statusNotExists',
          },
        });
      }

      status = {
        id: createUserDto.status.id,
      };
    }

    return this.usersRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: email,
      phone: phone,
      password: password,
      photo: photo,
      role: role,
      status: status,
      provider: createUserDto.provider ?? AuthProvidersEnum.email,
      socialId: createUserDto.socialId,
    });
  }

  async findByPhone(phone: string): Promise<User> {
    const user = await this.usersRepository.findByPhone(phone);
    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND, // Use HttpStatus for consistency
        errors: {
          phone: 'userWithPhoneNumberNotFound',
        },
      });
    }
    return user;
  }

  findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<User[]> {
    return this.usersRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  async findById(
    id: User['id'],
    requestingUser?: User, // Make requestingUser optional for internal calls
  ): Promise<NullableType<User>> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      return null;
    }

    // If a requestingUser is provided, check permissions
    if (requestingUser) {
      const isAdmin = requestingUser.role?.id === RoleEnum.admin;
      const isOwner = requestingUser.id === user.id;

      // Allow if user is an admin OR is the owner of the profile
      if (!isAdmin && !isOwner) {
        throw new ForbiddenException();
      }
    }
    console.log('requestingUser.role?.id >>>>>>', requestingUser);
    return user;
  }

  findByIds(ids: User['id'][]): Promise<User[]> {
    return this.usersRepository.findByIds(ids);
  }

  findByEmail(email: User['email']): Promise<NullableType<User>> {
    return this.usersRepository.findByEmail(email);
  }

  findBySocialIdAndProvider({
    socialId,
    provider,
  }: {
    socialId: User['socialId'];
    provider: User['provider'];
  }): Promise<NullableType<User>> {
    return this.usersRepository.findBySocialIdAndProvider({
      socialId,
      provider,
    });
  }

  async update(
    id: User['id'],
    updateUserDto: UpdateUserDto,
    requestingUser?: User, // <--- ADD the user making the request
  ): Promise<User | null> {
    // Do not remove comment below.
    // <updating-property />

    const isAdmin = requestingUser?.role?.id === RoleEnum.admin;
    const isOwner = requestingUser?.id === id;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException();
    }

    let password: string | undefined = undefined;

    if (updateUserDto.password) {
      const userObject = await this.usersRepository.findById(id);

      if (userObject && userObject?.password !== updateUserDto.password) {
        const salt = await bcrypt.genSalt();
        password = await bcrypt.hash(updateUserDto.password, salt);
      }
    }

    let email: string | null | undefined = undefined;

    if (updateUserDto.email) {
      const userObject = await this.usersRepository.findByEmail(
        updateUserDto.email,
      );

      if (userObject && userObject.id !== id) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailAlreadyExists',
          },
        });
      }

      email = updateUserDto.email;
    } else if (updateUserDto.email === null) {
      email = null;
    }

    let photo: FileType | null | undefined = undefined;
    if (updateUserDto.photo?.id) {
      const fileObject = await this.filesService.findById(
        updateUserDto.photo.id,
      );
      if (!fileObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            photo: 'imageNotExists',
          },
        });
      }
      photo = fileObject;
    } else if (updateUserDto.photo === null) {
      photo = null;
    }

    let role: Role | undefined = undefined;

    if (updateUserDto.role?.id) {
      const roleObject = Object.values(RoleEnum)
        .map(String)
        .includes(String(updateUserDto.role.id));
      if (!roleObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            role: 'roleNotExists',
          },
        });
      }

      role = {
        id: updateUserDto.role.id,
      };
    }

    let status: Status | undefined = undefined;

    if (updateUserDto.status?.id) {
      const statusObject = Object.values(StatusEnum)
        .map(String)
        .includes(String(updateUserDto.status.id));
      if (!statusObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            status: 'statusNotExists',
          },
        });
      }

      status = {
        id: updateUserDto.status.id,
      };
    }

    let identityPhoto: FileType | null | undefined = undefined;
    if (updateUserDto.identityPhoto?.id) {
      const fileObject = await this.filesService.findById(
        updateUserDto.identityPhoto.id,
      );
      if (!fileObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            identityPhoto: 'imageNotExists',
          },
        });
      }
      identityPhoto = fileObject;
    } else if (updateUserDto.identityPhoto === null) {
      identityPhoto = null;
    }

    const payloadToUpdate: Partial<User> = {};
    if (updateUserDto.firstName !== undefined)
      payloadToUpdate.firstName = updateUserDto.firstName;
    if (updateUserDto.address !== undefined)
      // This line should exist from our last step
      payloadToUpdate.address = updateUserDto.address;
    if (updateUserDto.lastName !== undefined)
      payloadToUpdate.lastName = updateUserDto.lastName;
    if (email !== undefined) payloadToUpdate.email = email;
    if (password !== undefined) payloadToUpdate.password = password;
    if (photo !== undefined) payloadToUpdate.photo = photo;

    // --- THIS IS THE FIX ---
    if (identityPhoto !== undefined) {
      payloadToUpdate.identityPhoto = identityPhoto;
    }
    // --- END OF FIX ---

    if (role !== undefined) payloadToUpdate.role = role;
    if (status !== undefined) payloadToUpdate.status = status;
    if (updateUserDto.provider !== undefined)
      payloadToUpdate.provider = updateUserDto.provider;
    if (updateUserDto.socialId !== undefined)
      payloadToUpdate.socialId = updateUserDto.socialId;

    console.log('payloadToUpdate >>>>>', payloadToUpdate);
    await this.usersRepository.update(id, payloadToUpdate);

    const updatedUser = await this.usersRepository.findById(id);
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found after update.`);
    }
    return updatedUser;
  }

  async remove(id: User['id'], requestingUser?: User): Promise<void> {
    const isAdmin = requestingUser?.role?.id === RoleEnum.admin;
    const isOwner = requestingUser?.id === id;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException();
    }

    await this.usersRepository.remove(id);
  }
}
