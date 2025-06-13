import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository, In } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { FilterUserDto, SortUserDto } from '../../../../dto/query-user.dto';
import { User } from '../../../../domain/user';
import { UserRepository } from '../../user.repository';
import { UserMapper } from '../mappers/user.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class UsersRelationalRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async create(data: User): Promise<User> {
    const persistenceModel = UserMapper.toPersistence(data);
    const newEntity = await this.usersRepository.save(
      this.usersRepository.create(persistenceModel),
    );
    return UserMapper.toDomain(newEntity);
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<User[]> {
    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    // Eagerly load relations needed for mapping
    queryBuilder.leftJoinAndSelect('user.role', 'role');
    queryBuilder.leftJoinAndSelect('user.status', 'status');
    queryBuilder.leftJoinAndSelect('user.photo', 'photo');

    // --- NEW LOGIC: Join and count files ---
    // This TypeORM feature loads the count of the 'files' relation
    // and maps it to a new property on the entity called 'filesCount'.
    queryBuilder.loadRelationCountAndMap('user.filesCount', 'user.files');
    // --- END OF NEW LOGIC ---

    if (filterOptions?.roles?.length) {
      queryBuilder.andWhere('role.id IN (:...roles)', {
        roles: filterOptions.roles.map((role) => role.id),
      });
    }

    if (sortOptions?.length) {
      sortOptions.forEach((sort) => {
        queryBuilder.addOrderBy(
          `user.${sort.orderBy}`,
          sort.order.toUpperCase() as 'ASC' | 'DESC',
        );
      });
    } else {
      queryBuilder.orderBy('user.createdAt', 'DESC'); // Default sort
    }

    queryBuilder
      .skip((paginationOptions.page - 1) * paginationOptions.limit)
      .take(paginationOptions.limit);

    const entities = await queryBuilder.getMany();

    return entities.map((userEntity) => {
      // We need to manually add filesCount to the domain mapping if it doesn't map automatically
      const userDomain = UserMapper.toDomain(userEntity);
      userDomain.filesCount = (userEntity as any).filesCount;
      return userDomain;
    });
  }

  async findById(id: User['id']): Promise<NullableType<User>> {
    const entity = await this.usersRepository.findOne({
      where: { id: Number(id) },
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByIds(ids: User['id'][]): Promise<User[]> {
    const entities = await this.usersRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((user) => UserMapper.toDomain(user));
  }

  async findByEmail(email: User['email']): Promise<NullableType<User>> {
    if (!email) return null;

    const entity = await this.usersRepository.findOne({
      where: { email },
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  // Add the findByPhone method:
  async findByPhone(phone: User['phone']): Promise<NullableType<User>> {
    if (!phone) return null;

    const entity = await this.usersRepository.findOne({
      where: { phone },
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findBySocialIdAndProvider({
    socialId,
    provider,
  }: {
    socialId: User['socialId'];
    provider: User['provider'];
  }): Promise<NullableType<User>> {
    if (!socialId || !provider) return null;

    const entity = await this.usersRepository.findOne({
      where: { socialId, provider },
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async update(id: User['id'], payload: Partial<User>): Promise<User> {
    const entity = await this.usersRepository.findOne({
      where: { id: Number(id) },
    });

    if (!entity) {
      throw new Error('User not found');
    }

    const updatedEntity = await this.usersRepository.save(
      this.usersRepository.create(
        UserMapper.toPersistence({
          ...UserMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return UserMapper.toDomain(updatedEntity);
  }

  async remove(id: User['id']): Promise<void> {
    await this.usersRepository.softDelete(id);
  }
}
