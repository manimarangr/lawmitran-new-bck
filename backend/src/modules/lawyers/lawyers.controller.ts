import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiOperation } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { AdminRole, Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminScopes } from '../../common/decorators/admin-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { LawyersService } from './lawyers.service';
import { AwardsService } from './awards.service';
import type { LawyerProfileFiles } from './lawyers.service';
import { CreateLawyerProfileDto } from './dto/create-lawyer-profile.dto';
import { ReviewLawyerDto } from './dto/review-lawyer.dto';
import { SearchLawyersDto } from './dto/search-lawyers.dto';
import { UpdateLawyerProfileDto } from './dto/update-lawyer-profile.dto';
import { PracticeAreaDto } from './dto/practice-area.dto';
import { CreateOfficeDto, SetServiceAreasDto, UpdateOfficeDto } from './dto/locations.dto';

@Controller('lawyers')
export class LawyersController {
  constructor(
    private lawyersService: LawyersService,
    private awardsService: AwardsService,
  ) {}

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

  // SEO-friendly public profile by slug (/lawyer/:slug)
  @Public()
  @Get('practice-areas')
  @ApiOperation({ summary: 'Practice area reference list (public)' })
  listPracticeAreas() {
    return this.lawyersService.listPracticeAreas();
  }

  @Public()
  @Get('courts')
  @ApiOperation({ summary: 'Court reference list (public)' })
  listCourts() {
    return this.lawyersService.listCourts();
  }

  @Public()
  @Get('languages')
  @ApiOperation({ summary: 'Language reference list (public)' })
  listLanguages() {
    return this.lawyersService.listLanguages();
  }

  @Public()
  @Get('states')
  @ApiOperation({ summary: 'State/UT reference list (public)' })
  listStates() {
    return this.lawyersService.listStates();
  }

  @Public()
  @Get('localities')
  @ApiOperation({ summary: 'Metro localities for a city (public) — ?city=Bengaluru' })
  listLocalities(@Query('city') city: string) {
    return this.lawyersService.listLocalities(city);
  }

  @Public()
  @Get('cities')
  @ApiOperation({
    summary: 'City autocomplete (public) — ?q=beng → Bengaluru, Karnataka',
  })
  suggestCities(@Query('q') q: string) {
    return this.lawyersService.suggestCities(q);
  }

  @Public()
  @Get('slug/:slug')
  getPublicProfileBySlug(@Param('slug') slug: string) {
    return this.lawyersService.getPublicProfileBySlug(slug);
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
      [
        { name: 'certificate', maxCount: 1 },
        { name: 'photo', maxCount: 1 },
      ],
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
  @Post('me/photo')
  @ApiOperation({ summary: 'Replace the profile photo' })
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'photo', maxCount: 1 }], {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  updateProfilePhoto(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFiles() files: LawyerProfileFiles,
  ) {
    return this.lawyersService.updateProfilePhoto(user.userId, files?.photo?.[0]);
  }

  @Roles(Role.LAWYER)
  @Post('me/reverify')
  @ApiOperation({ summary: 'Rejected lawyer re-uploads documents and re-enters the pending queue' })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'certificate', maxCount: 1 },
        { name: 'photo', maxCount: 1 },
      ],
      { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } },
    ),
  )
  resubmitVerification(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFiles() files: LawyerProfileFiles,
  ) {
    return this.lawyersService.resubmitVerification(user.userId, files ?? {});
  }

  @Roles(Role.LAWYER)
  @Patch('me/profile')
  updateOwnProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateLawyerProfileDto,
  ) {
    return this.lawyersService.updateOwnProfile(user.userId, dto);
  }

  @Roles(Role.LAWYER)
  @Get('me/locations')
  @ApiOperation({ summary: 'My offices, active service areas, and plan cap (docs/28)' })
  getMyLocations(@CurrentUser() user: CurrentUserPayload) {
    return this.lawyersService.getMyLocations(user.userId);
  }

  @Roles(Role.LAWYER)
  @Post('me/offices')
  @ApiOperation({ summary: 'Add an office (first office becomes primary)' })
  addOffice(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateOfficeDto) {
    return this.lawyersService.addOffice(user.userId, dto);
  }

  @Roles(Role.LAWYER)
  @Patch('me/offices/:id')
  @ApiOperation({ summary: 'Edit an office / set primary' })
  updateOffice(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOfficeDto,
  ) {
    return this.lawyersService.updateOffice(user.userId, id, dto);
  }

  @Roles(Role.LAWYER)
  @Post('me/offices/:id/photos')
  @ApiOperation({ summary: 'Upload office photos (max 3 kept, replaces existing)' })
  @UseInterceptors(
    FilesInterceptor('photos', 3, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadOfficePhotos(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @UploadedFiles() photos: Express.Multer.File[],
  ) {
    return this.lawyersService.setOfficePhotos(user.userId, id, photos ?? []);
  }

  @Roles(Role.LAWYER)
  @Delete('me/offices/:id')
  @ApiOperation({ summary: 'Remove an office (at least one must remain)' })
  deleteOffice(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.lawyersService.deleteOffice(user.userId, id);
  }

  @Roles(Role.LAWYER)
  @Put('me/service-areas')
  @ApiOperation({ summary: 'Replace my service areas (validated against the plan cap)' })
  setServiceAreas(@CurrentUser() user: CurrentUserPayload, @Body() dto: SetServiceAreasDto) {
    return this.lawyersService.setServiceAreas(user.userId, dto.cities);
  }

  @Roles(Role.ADMIN)
  @Get('admin/practice-areas')
  @ApiOperation({ summary: 'Practice areas with lawyer usage counts' })
  adminListPracticeAreas() {
    return this.lawyersService.adminListPracticeAreas();
  }

  @Roles(Role.ADMIN)
  @Post('admin/practice-areas')
  @ApiOperation({ summary: 'Add a practice area (slug auto-generated)' })
  createPracticeArea(@Body() dto: PracticeAreaDto) {
    return this.lawyersService.createPracticeArea(dto.name);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/practice-areas/:id')
  @ApiOperation({ summary: 'Rename a practice area (slug stays stable for SEO)' })
  renamePracticeArea(@Param('id') id: string, @Body() dto: PracticeAreaDto) {
    return this.lawyersService.renamePracticeArea(id, dto.name);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/practice-areas/:id')
  @ApiOperation({ summary: 'Delete a practice area (blocked while lawyers use it)' })
  deletePracticeArea(@Param('id') id: string) {
    return this.lawyersService.deletePracticeArea(id);
  }

  @Roles(Role.ADMIN)
  @Post('admin/awards/recompute')
  @ApiOperation({
    summary:
      'Recompute criteria-based awards for a year (default: current year) — add-only, idempotent',
  })
  recomputeAwards(@Query('year') year?: string) {
    const y = year ? Number(year) : new Date().getFullYear();
    return this.awardsService.computeAwardsForYear(y);
  }

  @Roles(Role.ADMIN)
  @Get('admin/lawyers')
  @ApiOperation({
    summary:
      'Full lawyer directory — ?status=PENDING|APPROVED|REJECTED|SUSPENDED|ALL, ?q=, ?sort=name|mobile|status|newest',
  })
  adminListLawyers(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.lawyersService.adminListLawyers(status, q, sort, page, pageSize);
  }

  @Roles(Role.ADMIN)
  @Get('admin/lawyers/:id')
  @ApiOperation({
    summary:
      'Single lawyer for the admin review page (also resolves lawyer-role users awaiting onboarding)',
  })
  adminGetLawyer(@Param('id') id: string) {
    return this.lawyersService.adminGetLawyer(id);
  }

  @Roles(Role.ADMIN)
  @Get('admin/pending')
  listPending(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.lawyersService.listPending(q, page, pageSize);
  }

  @Roles(Role.ADMIN)
  @AdminScopes(AdminRole.OPS)
  @Patch('admin/:id/review')
  review(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ReviewLawyerDto,
  ) {
    return this.lawyersService.review(user.userId, id, dto);
  }
}
