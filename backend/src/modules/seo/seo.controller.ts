import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpsertLandingDto } from './dto/upsert-landing.dto';
import { SeoService } from './seo.service';

@ApiTags('seo')
@Controller('seo')
export class SeoController {
  constructor(private seoService: SeoService) {}

  @Public()
  @Get('sitemap')
  @ApiOperation({
    summary: 'URL feed (lawyer slugs, cities, practice areas) for building XML sitemaps',
  })
  sitemap() {
    return this.seoService.sitemapFeed();
  }

  @Public()
  @Get('landing/:city/:practice')
  @ApiOperation({
    summary: 'Editable landing copy for a city × practice page (with generated fallback)',
  })
  getLanding(
    @Param('city') city: string,
    @Param('practice') practice: string,
  ) {
    return this.seoService.getLanding(city, practice);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/landing/:city/:practice')
  @ApiOperation({ summary: 'Create/update SEO copy for a city × practice landing page' })
  upsertLanding(
    @Param('city') city: string,
    @Param('practice') practice: string,
    @Body() dto: UpsertLandingDto,
  ) {
    return this.seoService.upsertLanding(city, practice, dto);
  }
}
