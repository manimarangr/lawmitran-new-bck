import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { LawyersService } from './lawyers.service';
import type { LawyerProfileFiles } from './lawyers.service';
import { CreateLawyerProfileDto } from './dto/create-lawyer-profile.dto';
import { ReviewLawyerDto } from './dto/review-lawyer.dto';
import { SearchLawyersDto } from './dto/search-lawyers.dto';
import { UpdateLawyerProfileDto } from './dto/update-lawyer-profile.dto';

@Controller('lawyers')
export class LawyersController {
  constructor(private lawyersService: LawyersService) {}

  @Public()
  @Get()
  search(@Query() query: SearchLawyersDto) {
    return this.lawyersService.search(query);
  }

  @Public()
  @Get('markers')
  findMarkers(@Query() query: SearchLawyersDto) {
    return this.lawyersService.findMarkers(query);
  }

  @Public()
  @Get(':id')
  getPublicProfile(@Param('id') id: string) {
    return this.lawyersService.getPublicProfile(id);
  }

  @Roles(Role.LAWYER)
  @Get('me/profile')
  getOwnProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.lawyersService.getOwnProfile(user.userId);
  }

  @Roles(Role.LAWYER)
  @Post('me/profile')
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'certificate', maxCount: 1 }],
      { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } },
    ),
  )
  createProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateLawyerProfileDto,
    @UploadedFiles() files: LawyerProfileFiles,
  ) {
    return this.lawyersService.createProfile(user.userId, dto, files ?? {});
  }

  @Roles(Role.LAWYER)
  @Patch('me/profile')
  updateOwnProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateLawyerProfileDto,
  ) {
    return this.lawyersService.updateOwnProfile(user.userId, dto);
  }

  @Roles(Role.ADMIN)
  @Get('admin/pending')
  listPending() {
    return this.lawyersService.listPending();
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:id/review')
  review(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ReviewLawyerDto,
  ) {
    return this.lawyersService.review(user.userId, id, dto);
  }
}
