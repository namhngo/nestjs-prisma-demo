import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from 'src/core/services/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import {
  ConflictException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from '../dtos/create-user.dto';
import { LoginUserDto } from '../dtos/login-user.dto';
import { UpdateUsertDto } from '../dtos/update-user.dto';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: DeepMockProxy<PrismaClient>;
  let jwtService: JwtService;

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // SIGNUP users service unit test

  describe('registerUser', () => {
    // signup user successfully
    it('should register a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@user.com',
        name: 'Test User',
        password: 'password123',
      };

      const hashedPassword = 'hashedPassword123';
      const mockCreatedUser = {
        id: 1,
        email: 'test@user.com',
        name: 'Test User',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      prismaMock.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.registerUser(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: createUserDto.email,
          password: hashedPassword,
          name: createUserDto.name,
        },
      });

      // Should return user without password
      expect(result).toEqual({
        id: 1,
        email: 'test@user.com',
        name: 'Test User',
        createdAt: mockCreatedUser.createdAt,
        updatedAt: mockCreatedUser.updatedAt,
      });
      expect(result).not.toHaveProperty('password');
    });

    // signup when email already exists
    it('should throw ConflictException when email already exists (P2002 error)', async () => {
      const createUserDto: CreateUserDto = {
        email: 'existing@user.com',
        name: 'Test User',
        password: 'password123',
      };

      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
      };

      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      prismaMock.user.create.mockRejectedValue(prismaError);

      await expect(service.registerUser(createUserDto)).rejects.toThrow(
        new ConflictException('Email already registered')
      );

      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    // signup when has errors
    it('should throw HttpException for other database errors', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@user.com',
        name: 'Test User',
        password: 'password123',
      };

      const prismaError = {
        code: 'P2000',
        message: 'Some other database error',
      };

      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      prismaMock.user.create.mockRejectedValue(prismaError);

      await expect(service.registerUser(createUserDto)).rejects.toThrow(
        new HttpException(prismaError, 500)
      );
    });
  });

  //--------------------------------------------------------------------------------------------

  // LOGIN user service unit test

  describe('loginUser', () => {
    // login successfully
    it('should login user successfully with valid credentials', async () => {
      const loginUserDto: LoginUserDto = {
        email: 'test@user.com',
        password: 'password123',
      };

      const mockUser = {
        id: 1,
        email: 'test@user.com',
        name: 'Test User',
        password: 'hashedPassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockToken = 'jwt-token-here';

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.signAsync.mockResolvedValue(mockToken);

      const result = await service.loginUser(loginUserDto);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginUserDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginUserDto.password,
        mockUser.password
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      });

      expect(result).toEqual({
        access_token: mockToken,
      });
    });

    // login when user not found
    it('should throw NotFoundException when user does not exist', async () => {
      const loginUserDto: LoginUserDto = {
        email: 'notfound@user.com',
        password: 'password123',
      };

      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.loginUser(loginUserDto)).rejects.toThrow(
        new NotFoundException('User not found')
      );

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginUserDto.email },
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    // login when password is incorrect
    it('should throw UnauthorizedException when password is incorrect', async () => {
      const loginUserDto: LoginUserDto = {
        email: 'test@user.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 1,
        email: 'test@user.com',
        name: 'Test User',
        password: 'hashedPassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.loginUser(loginUserDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials')
      );

      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginUserDto.password,
        mockUser.password
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    // login when has http errors
    it('should throw HttpException for other errors', async () => {
      const loginUserDto: LoginUserDto = {
        email: 'test@user.com',
        password: 'password123',
      };

      const error = new Error('Database connection failed');
      prismaMock.user.findUnique.mockRejectedValue(error);

      await expect(service.loginUser(loginUserDto)).rejects.toThrow(
        new HttpException(error, 500)
      );
    });
  });

  //--------------------------------------------------------------------------------------------

  // UPDATE user service unit test

  describe('updateUser', () => {
    // update user successfully
    it('should update user successfully without password', async () => {
      const userId = 1;
      const updateUserDto: UpdateUsertDto = {
        name: 'Updated Name',
        email: 'updated@user.com',
      };

      const existingUser = {
        id: 1,
        email: 'test@user.com',
        name: 'Test User',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser = {
        id: 1,
        email: 'updated@user.com',
        name: 'Updated Name',
        password: 'hashedPassword',
        createdAt: existingUser.createdAt,
        updatedAt: new Date(),
      };

      prismaMock.user.findUniqueOrThrow.mockResolvedValue(existingUser);
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser(userId, updateUserDto);

      expect(prismaMock.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateUserDto,
      });

      // Should return user without password
      expect(result).toEqual({
        id: 1,
        email: 'updated@user.com',
        name: 'Updated Name',
        createdAt: existingUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      });
      expect(result).not.toHaveProperty('password');
    });

    // update user with hashed password
    it('should update user successfully with password hashing', async () => {
      const userId = 1;
      const updateUserDto: UpdateUsertDto = {
        name: 'Updated Name',
        password: 'newpassword123',
      };

      const existingUser = {
        id: 1,
        email: 'test@user.com',
        name: 'Test User',
        password: 'oldHashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newHashedPassword = 'newHashedPassword123';
      const updatedUser = {
        ...existingUser,
        name: 'Updated Name',
        password: newHashedPassword,
        updatedAt: new Date(),
      };

      prismaMock.user.findUniqueOrThrow.mockResolvedValue(existingUser);
      mockedBcrypt.hash.mockResolvedValue(newHashedPassword as never);
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser(userId, updateUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(updateUserDto.password, 10);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          name: updateUserDto.name,
          password: newHashedPassword,
        },
      });

      expect(result).not.toHaveProperty('password');
    });

    // udpate when user not found
    it('should throw NotFoundException when user not found (P2025 error)', async () => {
      const userId = 999;
      const updateUserDto: UpdateUsertDto = {
        name: 'Updated Name',
      };

      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      };

      prismaMock.user.findUniqueOrThrow.mockRejectedValue(prismaError);

      await expect(service.updateUser(userId, updateUserDto)).rejects.toThrow(
        new NotFoundException(`User with id ${userId} not found`)
      );

      expect(prismaMock.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    // update user when email already exist
    it('should throw ConflictException when email already exists (P2002 error)', async () => {
      const userId = 1;
      const updateUserDto: UpdateUsertDto = {
        email: 'existing@user.com',
      };

      const existingUser = {
        id: 1,
        email: 'test@user.com',
        name: 'Test User',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
      };

      prismaMock.user.findUniqueOrThrow.mockResolvedValue(existingUser);
      prismaMock.user.update.mockRejectedValue(prismaError);

      await expect(service.updateUser(userId, updateUserDto)).rejects.toThrow(
        new ConflictException('Email already registered')
      );
    });

    // update when has http errors
    it('should throw HttpException for other errors', async () => {
      const userId = 1;
      const updateUserDto: UpdateUsertDto = {
        name: 'Updated Name',
      };

      const error = new Error('Database connection failed');
      prismaMock.user.findUniqueOrThrow.mockRejectedValue(error);

      await expect(service.updateUser(userId, updateUserDto)).rejects.toThrow(
        new HttpException(error, 500)
      );
    });
  });

  //--------------------------------------------------------------------------------------------

  // DELETE user service unit test

  describe('deleteUser', () => {
    // delete user successfully
    it('should delete user successfully', async () => {
      const userId = 1;
      const existingUser = {
        id: 1,
        email: 'test@user.com',
        name: 'Test User',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUniqueOrThrow.mockResolvedValue(existingUser);
      prismaMock.user.delete.mockResolvedValue(existingUser);

      const result = await service.deleteUser(userId);

      expect(prismaMock.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });

      expect(result).toBe(`User with id ${userId} deleted`);
    });

    // delete when user not found
    it('should throw NotFoundException when user not found (P2025 error)', async () => {
      const userId = 999;

      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      };

      prismaMock.user.findUniqueOrThrow.mockRejectedValue(prismaError);

      await expect(service.deleteUser(userId)).rejects.toThrow(
        new NotFoundException(`User with id ${userId} not found`)
      );

      expect(prismaMock.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
    });

    // delete but has errors
    it('should throw HttpException for other errors', async () => {
      const userId = 1;
      const existingUser = {
        id: 1,
        email: 'test@user.com',
        name: 'Test User',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const error = new Error('Database connection failed');

      prismaMock.user.findUniqueOrThrow.mockResolvedValue(existingUser);
      prismaMock.user.delete.mockRejectedValue(error);

      await expect(service.deleteUser(userId)).rejects.toThrow(
        new HttpException(error, 500)
      );
    });
  });
});