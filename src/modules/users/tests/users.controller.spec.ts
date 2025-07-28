import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let jwtService: JwtService;

  // Mock UsersService
  const mockUsersService = {
    registerUser: jest.fn(),
    loginUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    // Add other service methods as needed
  };

  // Mock JwtService
  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // SIGNUP user unit test
 
  describe('registerUser', () => {
    // signup successfully
    it('should register a new user successfully', async () => {
      const createUserDto = {
        email: 'test@user.com',
        name: 'Test User',
        password: 'password',
      };

      const mockUser: Omit<User, 'password'> = {
        id: 1,
        email: 'test@user.com',
        name: 'Test User',
      };

      mockUsersService.registerUser.mockResolvedValue(mockUser);

      const result = await controller.registerUser(createUserDto);

      expect(usersService.registerUser).toHaveBeenCalledWith(createUserDto);
      expect(usersService.registerUser).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUser);
    });

    // signup when email already exists
    it('should throw ConflictException when email already exists', async () => {
      const createUserDto = {
        email: 'existing@user.com',
        name: 'Test User',
        password: 'password',
      };

      mockUsersService.registerUser.mockRejectedValue(
        new ConflictException('Email already exists')
      );

      await expect(controller.registerUser(createUserDto)).rejects.toThrow(
        ConflictException
      );
      expect(usersService.registerUser).toHaveBeenCalledWith(createUserDto);
    });

    // signup when missing fields
    it('should throw BadRequestException when required fields are missing', async () => {
      const invalidDto = {
        email: '',
        name: '',
        password: '',
      };

      mockUsersService.registerUser.mockRejectedValue(
        new BadRequestException('Required fields are missing')
      );

      await expect(controller.registerUser(invalidDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  //------------------------------------------------------------------------------------------

  // LOGIN user unit test

  describe('loginUser', () => {
    // login succesfully
    it('should login user successfully', async () => {
      const loginDto = {
        email: 'test@user.com',
        password: 'password',
      };

      const mockLoginResponse = {
        access_token: 'jwt-token-here',
        user: {
          id: 1,
          email: 'test@user.com',
          name: 'Test User',
        },
      };

      mockUsersService.loginUser.mockResolvedValue(mockLoginResponse);

      const result = await controller.loginUser(loginDto);

      expect(usersService.loginUser).toHaveBeenCalledWith(loginDto);
      expect(usersService.loginUser).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockLoginResponse);
      expect(result.access_token).toBeDefined();
    });

    // login when user not found
    it('should throw NotFoundException when user not found', async () => {
      const loginDto = {
        email: 'notfound@user.com',
        password: 'password',
      };

      mockUsersService.loginUser.mockRejectedValue(
        new NotFoundException('User not found')
      );

      await expect(controller.loginUser(loginDto)).rejects.toThrow(
        NotFoundException
      );
      expect(usersService.loginUser).toHaveBeenCalledWith(loginDto);
    });

    // login when credentials are invalid
    it('should throw BadRequestException when credentials are invalid', async () => {
      const loginDto = {
        email: 'test@user.com',
        password: 'wrongpassword',
      };

      mockUsersService.loginUser.mockRejectedValue(
        new BadRequestException('Invalid credentials')
      );

      await expect(controller.loginUser(loginDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  //------------------------------------------------------------------------------------------

  describe('me', () => {
    it('should return user profile from JWT payload', () => {
      const mockJwtPayload = {
        sub: 1,
        email: 'test@user.com',
        name: 'Test User',
        iat: 1698562521,
        exp: 1698605721,
      };
  
      const mockRequest = {
        user: mockJwtPayload,
      } as any; 
  
      const result = controller.me(mockRequest);
  
      expect(result).toEqual(mockJwtPayload);
      expect(result).toHaveProperty('sub');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('name');
    });
  });

  //------------------------------------------------------------------------------------------

  // UPDATE user unit test

  describe('updateUser', () => {
    // update user successfully
    it('should update user successfully', async () => {
      const userId = 1;
      const updateDto = {
        name: 'Updated Name',
        email: 'updated@user.com',
      };

      const mockUpdatedUser = {
        id: 1,
        email: 'updated@user.com',
        name: 'Updated Name',
      };

      mockUsersService.updateUser.mockResolvedValue(mockUpdatedUser);

      const result = await controller.updateUser(userId, updateDto);

      expect(usersService.updateUser).toHaveBeenCalledWith(userId, updateDto);
      expect(usersService.updateUser).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUpdatedUser);
    });

    // update user not found
    it('should throw NotFoundException when user not found', async () => {
      const userId = 999;
      const updateDto = {
        name: 'Updated Name',
      };

      mockUsersService.updateUser.mockRejectedValue(
        new NotFoundException('User not found')
      );

      await expect(controller.updateUser(userId, updateDto)).rejects.toThrow(
        NotFoundException
      );
      expect(usersService.updateUser).toHaveBeenCalledWith(userId, updateDto);
    });
  });

  //------------------------------------------------------------------------------------------

  // DELETE user unit test

  describe('deleteUser', () => {
    // delete user successfully
    it('should delete user successfully', async () => {
      const userId = 1;
      const mockDeleteResponse = { message: 'User deleted successfully' };

      mockUsersService.deleteUser.mockResolvedValue(mockDeleteResponse);

      const result = await controller.deleteUser(userId);

      expect(usersService.deleteUser).toHaveBeenCalledWith(userId);
      expect(usersService.deleteUser).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockDeleteResponse);
    });

    // delete user not found
    it('should throw NotFoundException when user not found', async () => {
      const userId = 999;

      mockUsersService.deleteUser.mockRejectedValue(
        new NotFoundException('User not found')
      );

      await expect(controller.deleteUser(userId)).rejects.toThrow(
        NotFoundException
      );
      expect(usersService.deleteUser).toHaveBeenCalledWith(userId);
    });
  });
});