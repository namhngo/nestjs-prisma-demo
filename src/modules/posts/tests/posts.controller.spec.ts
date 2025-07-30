import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from '../posts.controller';
import { PostsService } from '../posts.service';
import { Post } from '@prisma/client';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreatePostDto } from '../dtos/create-post.dto';
import { UpdatePostDto } from '../dtos/update-post.dto';
import { QueryPaginationDto } from 'src/common/dtos/query-pagination.dto';
import { PaginateOutput } from 'src/common/utils/pagination.utils';

describe('PostsController', () => {
  let controller: PostsController;
  let postsService: PostsService;

  // Mock PostsService
  const mockPostsService = {
    createPost: jest.fn(),
    getAllPosts: jest.fn(),
    getPostById: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        {
          provide: PostsService,
          useValue: mockPostsService,
        },
      ],
    }).compile();

    controller = module.get<PostsController>(PostsController);
    postsService = module.get<PostsService>(PostsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // CREATE post unit test
  describe('createPost', () => {
    // create post successfully
    it('should create a new post successfully', async () => {
      const createPostDto: CreatePostDto = {
        title: 'Test Post',
        content: 'This is a test post content',
        published: true,
        authorId: 1,
      };

      const mockRequest = {
        user: { sub: 1 },
      } as any;

      const mockPost: Post = {
        id: 1,
        title: 'Test Post',
        content: 'This is a test post content',
        published: true,
        authorId: 1,
      };

      mockPostsService.createPost.mockResolvedValue(mockPost);

      const result = await controller.createPost(createPostDto, mockRequest);

      expect(createPostDto.authorId).toBe(1);
      expect(postsService.createPost).toHaveBeenCalledWith(createPostDto);
      expect(postsService.createPost).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPost);
    });

    // create post when author not found
    it('should throw NotFoundException when author not found', async () => {
      const createPostDto: CreatePostDto = {
        title: 'Test Post',
        content: 'This is a test post content',
        published: true,
        authorId: 999,
      };

      const mockRequest = {
        user: { sub: 999 },
      } as any;

      mockPostsService.createPost.mockRejectedValue(
        new NotFoundException('Author not found')
      );

      await expect(controller.createPost(createPostDto, mockRequest)).rejects.toThrow(
        NotFoundException
      );
      expect(postsService.createPost).toHaveBeenCalledWith(createPostDto);
    });

    // create post when missing required fields
    it('should throw BadRequestException when required fields are missing', async () => {
      const invalidDto = {
        title: '',
        content: '',
        published: false,
        authorId: 1,
      };

      const mockRequest = {
        user: { sub: 1 },
      } as any;

      mockPostsService.createPost.mockRejectedValue(
        new BadRequestException('Required fields are missing')
      );

      await expect(controller.createPost(invalidDto, mockRequest)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  //-----------------------------------------------------------------------------------------

  // GET ALL posts unit test
  describe('getAllPosts', () => {
    // get all posts successfully
    it('should return paginated posts successfully', async () => {
      const query: QueryPaginationDto = {
        page: '1',
        size: '10',
      };

      const mockPosts: Post[] = [
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

      const mockPaginatedResponse: PaginateOutput<Post> = {
        data: mockPosts,
        meta: {
          total: 2,
          lastPage: 1,
          currentPage: 1,
          totalPerPage: 10,
          prevPage: null,
          nextPage: null,
        },
      };

      mockPostsService.getAllPosts.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.getAllPosts(query);

      expect(postsService.getAllPosts).toHaveBeenCalledWith(query);
      expect(postsService.getAllPosts).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.data).toHaveLength(2);
    });

    // get all posts without query parameters
    it('should return paginated posts with default pagination when no query provided', async () => {
      const mockPosts: Post[] = [
        {
          id: 1,
          title: 'Post 1',
          content: 'Content 1',
          published: true,
          authorId: 1,
        },
      ];

      const mockPaginatedResponse: PaginateOutput<Post> = {
        data: mockPosts,
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
          totalPerPage: 10,
          prevPage: null,
          nextPage: null,
        },
      };

      mockPostsService.getAllPosts.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.getAllPosts();

      expect(postsService.getAllPosts).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  //-----------------------------------------------------------------------------------------

  // GET post by ID unit test
  describe('getPostById', () => {
    // get post by id successfully
    it('should return post by id successfully', async () => {
      const postId = 1;
      const mockPost: Post = {
        id: 1,
        title: 'Test Post',
        content: 'This is a test post content',
        published: true,
        authorId: 1,
      };

      mockPostsService.getPostById.mockResolvedValue(mockPost);

      const result = await controller.getPostById(postId);

      expect(postsService.getPostById).toHaveBeenCalledWith(postId);
      expect(postsService.getPostById).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPost);
    });

    // get post by id when post not found
    it('should throw NotFoundException when post not found', async () => {
      const postId = 999;

      mockPostsService.getPostById.mockRejectedValue(
        new NotFoundException('Post not found')
      );

      await expect(controller.getPostById(postId)).rejects.toThrow(
        NotFoundException
      );
      expect(postsService.getPostById).toHaveBeenCalledWith(postId);
    });
  });

  //-----------------------------------------------------------------------------------------

  // UPDATE post unit test
  describe('updatePost', () => {
    // update post successfully
    it('should update post successfully', async () => {
      const postId = 1;
      const updateDto: UpdatePostDto = {
        title: 'Updated Post Title',
        content: 'Updated content',
        published: true,
      };

      const mockUpdatedPost: Post = {
        id: 1,
        title: 'Updated Post Title',
        content: 'Updated content',
        published: true,
        authorId: 1,
      };

      mockPostsService.updatePost.mockResolvedValue(mockUpdatedPost);

      const result = await controller.updatePost(postId, updateDto);

      expect(postsService.updatePost).toHaveBeenCalledWith(postId, updateDto);
      expect(postsService.updatePost).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUpdatedPost);
    });

    // update post when post not found
    it('should throw NotFoundException when post not found', async () => {
      const postId = 999;
      const updateDto: UpdatePostDto = {
        title: 'Updated Title',
      };

      mockPostsService.updatePost.mockRejectedValue(
        new NotFoundException('Post not found')
      );

      await expect(controller.updatePost(postId, updateDto)).rejects.toThrow(
        NotFoundException
      );
      expect(postsService.updatePost).toHaveBeenCalledWith(postId, updateDto);
    });
  });

  //-----------------------------------------------------------------------------------------

  // DELETE post unit test
  describe('deletePost', () => {
    // delete post successfully
    it('should delete post successfully', async () => {
      const postId = 1;
      const mockDeleteResponse = 'Post with id 1 deleted';

      mockPostsService.deletePost.mockResolvedValue(mockDeleteResponse);

      const result = await controller.deletePost(postId);

      expect(postsService.deletePost).toHaveBeenCalledWith(postId);
      expect(postsService.deletePost).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockDeleteResponse);
    });

    // delete post when post not found
    it('should throw NotFoundException when post not found', async () => {
      const postId = 999;

      mockPostsService.deletePost.mockRejectedValue(
        new NotFoundException('Post not found')
      );

      await expect(controller.deletePost(postId)).rejects.toThrow(
        NotFoundException
      );
      expect(postsService.deletePost).toHaveBeenCalledWith(postId);
    });
  });
});