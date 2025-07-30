import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from '../posts.service';
import { PrismaService } from 'src/core/services/prisma.service';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import {
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { CreatePostDto } from '../dtos/create-post.dto';
import { UpdatePostDto } from '../dtos/update-post.dto';
import { QueryPaginationDto } from 'src/common/dtos/query-pagination.dto';

describe('PostsService', () => {
  let service: PostsService;
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // CREATE post service unit test
  describe('createPost', () => {
    // create post successfully
    it('should create a new post successfully', async () => {
      const createPostDto: CreatePostDto = {
        title: 'Test Post',
        content: 'This is a test post content',
        published: true,
        authorId: 1,
      };

      const mockCreatedPost = {
        id: 1,
        title: 'Test Post',
        content: 'This is a test post content',
        published: true,
        authorId: 1,
      };

      prismaMock.post.create.mockResolvedValue(mockCreatedPost);

      const result = await service.createPost(createPostDto);

      expect(prismaMock.post.create).toHaveBeenCalledWith({
        data: createPostDto,
      });
      expect(result).toEqual(mockCreatedPost);
    });

    // create post when author not found
    it('should throw NotFoundException when author not found (P2003 error)', async () => {
      const createPostDto: CreatePostDto = {
        title: 'Test Post',
        content: 'This is a test post content',
        published: true,
        authorId: 999,
      };

      const prismaError = {
        code: 'P2003',
        message: 'Foreign key constraint failed',
      };

      prismaMock.post.create.mockRejectedValue(prismaError);

      await expect(service.createPost(createPostDto)).rejects.toThrow(
        new NotFoundException('Author not found')
      );

      expect(prismaMock.post.create).toHaveBeenCalledWith({
        data: createPostDto,
      });
    });

    // create post when title already exists (if unique constraint exists)
    it('should throw ConflictException when unique constraint failed (P2002 error)', async () => {
      const createPostDto: CreatePostDto = {
        title: 'Existing Post Title',
        content: 'This is a test post content',
        published: true,
        authorId: 1,
      };

      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
      };

      prismaMock.post.create.mockRejectedValue(prismaError);

      await expect(service.createPost(createPostDto)).rejects.toThrow(
        new ConflictException('Email already registered')
      );
    });

    // create post when has other errors
    it('should throw HttpException for other database errors', async () => {
      const createPostDto: CreatePostDto = {
        title: 'Test Post',
        content: 'This is a test post content',
        published: true,
        authorId: 1,
      };

      const prismaError = {
        code: 'P2000',
        message: 'Some other database error',
      };

      prismaMock.post.create.mockRejectedValue(prismaError);

      await expect(service.createPost(createPostDto)).rejects.toThrow(
        new HttpException(prismaError, 500)
      );
    });
  });

  //-------------------------------------------------------------------------------------------

  // GET ALL posts service unit test
  describe('getAllPosts', () => {
    // get all posts successfully with pagination
    it('should return paginated posts successfully', async () => {
      const query: QueryPaginationDto = {
        page: '1',
        size: '10',
      };

      const mockPosts = [
        {
          id: 1,
          title: 'Post 1',
          content: 'Content 1',
          published: true,
          authorId: 1,
        },
        {
          id: 2,
          title: 'Post 2',
          content: 'Content 2',
          published: false,
          authorId: 2,
        },
      ];

      const mockTotal = 2;

      prismaMock.post.findMany.mockResolvedValue(mockPosts);
      prismaMock.post.count.mockResolvedValue(mockTotal);

      const result = await service.getAllPosts(query);

      expect(prismaMock.post.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
      expect(prismaMock.post.count).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockPosts,
        meta: {
          total: mockTotal,
          lastPage: 1,
          currentPage: 1,
          totalPerPage: 10,
          prevPage: null,
          nextPage: null,
        },
      });
    });

    // get all posts when empty result
    it('should return empty array when no posts found', async () => {
      const query: QueryPaginationDto = {
        page: '1',
        size: '10',
      };

      const mockPosts = [];
      const mockTotal = 0;

      prismaMock.post.findMany.mockResolvedValue(mockPosts);
      prismaMock.post.count.mockResolvedValue(mockTotal);

      const result = await service.getAllPosts(query);

      expect(result).toEqual({
        data: [],
        meta: {
          total: 0,
          lastPage: 0,
          currentPage: 1,
          totalPerPage: 10,
          prevPage: null,
          nextPage: null,
        },
      });
    });
  });

  //-------------------------------------------------------------------------------------------

  // GET post by ID service unit test
  describe('getPostById', () => {
    // get post by id successfully
    it('should return post by id successfully', async () => {
      const postId = 1;
      const mockPost = {
        id: 1,
        title: 'Test Post',
        content: 'This is a test post content',
        published: true,
        authorId: 1,
      };

      prismaMock.post.findUniqueOrThrow.mockResolvedValue(mockPost);

      const result = await service.getPostById(postId);

      expect(prismaMock.post.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(result).toEqual(mockPost);
    });

    // get post by id when post not found
    it('should throw NotFoundException when post not found (P2025 error)', async () => {
      const postId = 999;

      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      };

      prismaMock.post.findUniqueOrThrow.mockRejectedValue(prismaError);

      await expect(service.getPostById(postId)).rejects.toThrow(
        new NotFoundException(`Post with id ${postId} not found`)
      );

      expect(prismaMock.post.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: postId },
      });
    });

    // get post by id when has other errors
    it('should throw HttpException for other errors', async () => {
      const postId = 1;
      const error = new Error('Database connection failed');

      prismaMock.post.findUniqueOrThrow.mockRejectedValue(error);

      await expect(service.getPostById(postId)).rejects.toThrow(
        new HttpException(error, 500)
      );
    });
  });

  //-------------------------------------------------------------------------------------------

  // UPDATE post service unit test
  describe('updatePost', () => {
    // update post successfully
    it('should update post successfully', async () => {
      const postId = 1;
      const updatePostDto: UpdatePostDto = {
        title: 'Updated Post Title',
        content: 'Updated content',
        published: true,
      };

      const existingPost = {
        id: 1,
        title: 'Original Title',
        content: 'Original content',
        published: false,
        authorId: 1,
      };

      const updatedPost = {
        id: 1,
        title: 'Updated Post Title',
        content: 'Updated content',
        published: true,
        authorId: 1,
      };

      prismaMock.post.findUniqueOrThrow.mockResolvedValue(existingPost);
      prismaMock.post.update.mockResolvedValue(updatedPost);

      const result = await service.updatePost(postId, updatePostDto);

      expect(prismaMock.post.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(prismaMock.post.update).toHaveBeenCalledWith({
        where: { id: postId },
        data: updatePostDto,
      });
      expect(result).toEqual(updatedPost);
    });

    // update post when post not found
    it('should throw NotFoundException when post not found (P2025 error)', async () => {
      const postId = 999;
      const updatePostDto: UpdatePostDto = {
        title: 'Updated Title',
      };

      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      };

      prismaMock.post.findUniqueOrThrow.mockRejectedValue(prismaError);

      await expect(service.updatePost(postId, updatePostDto)).rejects.toThrow(
        new NotFoundException(`Post with id ${postId} not found`)
      );

      expect(prismaMock.post.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(prismaMock.post.update).not.toHaveBeenCalled();
    });

    // update post when unique constraint failed
    it('should throw ConflictException when unique constraint failed (P2002 error)', async () => {
      const postId = 1;
      const updatePostDto: UpdatePostDto = {
        title: 'Existing Title',
      };

      const existingPost = {
        id: 1,
        title: 'Original Title',
        content: 'Original content',
        published: false,
        authorId: 1,
      };

      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
      };

      prismaMock.post.findUniqueOrThrow.mockResolvedValue(existingPost);
      prismaMock.post.update.mockRejectedValue(prismaError);

      await expect(service.updatePost(postId, updatePostDto)).rejects.toThrow(
        new ConflictException('Email already registered')
      );
    });

    // update post when has other errors
    it('should throw HttpException for other errors', async () => {
      const postId = 1;
      const updatePostDto: UpdatePostDto = {
        title: 'Updated Title',
      };

      const error = new Error('Database connection failed');
      prismaMock.post.findUniqueOrThrow.mockRejectedValue(error);

      await expect(service.updatePost(postId, updatePostDto)).rejects.toThrow(
        new HttpException(error, 500)
      );
    });
  });

  //-------------------------------------------------------------------------------------------

  // DELETE post service unit test
  describe('deletePost', () => {
    // delete post successfully
    it('should delete post successfully', async () => {
      const postId = 1;
      const existingPost = {
        id: 1,
        title: 'Test Post',
        content: 'Test content',
        published: true,
        authorId: 1,
      };

      prismaMock.post.findUniqueOrThrow.mockResolvedValue(existingPost);
      prismaMock.post.delete.mockResolvedValue(existingPost);

      const result = await service.deletePost(postId);

      expect(prismaMock.post.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(prismaMock.post.delete).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(result).toBe(`Post with id ${postId} deleted`);
    });

    // delete post when post not found
    it('should throw NotFoundException when post not found (P2025 error)', async () => {
      const postId = 999;

      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      };

      prismaMock.post.findUniqueOrThrow.mockRejectedValue(prismaError);

      await expect(service.deletePost(postId)).rejects.toThrow(
        new NotFoundException(`Post with id ${postId} not found`)
      );

      expect(prismaMock.post.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(prismaMock.post.delete).not.toHaveBeenCalled();
    });

    // delete post when has other errors
    it('should throw HttpException for other errors', async () => {
      const postId = 1;
      const existingPost = {
        id: 1,
        title: 'Test Post',
        content: 'Test content',
        published: true,
        authorId: 1,
      };

      const error = new Error('Database connection failed');

      prismaMock.post.findUniqueOrThrow.mockResolvedValue(existingPost);
      prismaMock.post.delete.mockRejectedValue(error);

      await expect(service.deletePost(postId)).rejects.toThrow(
        new HttpException(error, 500)
      );
    });
  });
});