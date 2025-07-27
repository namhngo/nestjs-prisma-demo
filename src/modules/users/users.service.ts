import { ConflictException, HttpException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/core/services/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { compare, hash } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dtos/login-user.dto';
import { LoginResponse, UserPayload } from './interfaces/users-login.interface';
import { UpdateUsertDto } from './dtos/update-user.dto';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
      ) {}


  // CREATE user
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

  // LOGIN user
  async loginUser(loginUserDto: LoginUserDto): Promise<LoginResponse> {
      try {
          // find user by email
          const user = await this.prisma.user.findUnique({
              where: {email: loginUserDto.email},
          })

          // check if user exists
          if(!user) {
              throw new NotFoundException('User not found');
          }

          // check if password is correct by comparing it with the hashed password in the database
          if (!(await compare(loginUserDto.password, user.password))) {
            throw new UnauthorizedException('Invalid credentials');
          }
          
          const payload: UserPayload = {
            // create payload for JWT
            sub: user.id, // sub is short for subject. It is the user id
            email: user.email,
            name: user.name,
          };
      
          return {
            // return access token
            access_token: await this.jwtService.signAsync(payload),
          };
      } catch (error) {
          // throw error if any
          throw new HttpException(error, 500);
      }
  }

  //UPDATE user
  async updateUser(id: number, updateUserDto: UpdateUsertDto): Promise<User> {
      try {
          // find user by id. If not found, throw error
          await this.prisma.user.findUniqueOrThrow({
              where: {id},
          })

          // update user using prisma client
          const updatedUser = await this.prisma.user.update({
              where: {id},
              data: {
                  ...updateUserDto,
                  // if password is provided, hash it
                  ...(updateUserDto.password && {
                    password: await hash(updateUserDto.password, 10),
                  })
              }
          });

          delete updatedUser.password;

          return updatedUser;
      } catch (error) {
          // check if user not found and throw error
          if(error.code === 'P2025') {
            throw new NotFoundException(`User with id ${id} not found`);
          }

          // check if email already registered and throw error
          if (error.code === 'P2002') {
            throw new ConflictException('Email already registered');
          }

          // throw error if any
          throw new HttpException(error, 500);
      }
  }

  // async deleteUser
}