import { ConflictException, HttpException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/core/services/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { hash } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
      ) {}

  // create a new user
  async registerUser(createUserDto: CreateUserDto): Promise<User> {
      try {
          const newUser = await this.prisma.user.create({
              data: {
                  email: createUserDto.email,
                  password: await hash(createUserDto.password, 10),
                  name: createUserDto.name
              }
          });

          // remove password from response
          delete newUser.password;

          return newUser;

      } catch (error) {
          // check if email already registered and throw error
          if (error.code === 'P2002') {
            throw new ConflictException('Email already registered');
          }
          // throw error if any
          throw new HttpException(error, 500);
      }
  }

  // async loginUser

  // async updateUser

  // async deleteUser
}