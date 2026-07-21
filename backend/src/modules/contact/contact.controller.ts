import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SettingsService } from '../settings/settings.service';
import { ContactService } from './contact.service';
import { CreateContactQueryDto } from './dto/create-contact-query.dto';
import { ResolveContactQueryDto } from './dto/resolve-contact-query.dto';

@ApiTags('contact')
@ApiBearerAuth()
@Controller('contact')
export class ContactController {
  constructor(
    private contactService: ContactService,
    private settings: SettingsService,
  ) {}

  @Public()
  @Get('grievance')
  @ApiOperation({ summary: 'Grievance officer details (IT Rules) — public' })
  async grievance() {
    return {
      name: (await this.settings.get('GRIEVANCE_OFFICER_NAME')) || null,
      email:
        (await this.settings.get('GRIEVANCE_OFFICER_EMAIL')) ||
        (await this.settings.get('SUPPORT_EMAIL')) ||
        'support@lawmitran.com',
    };
  }

  @Public()
  @Post()
  @ApiOperation({
    summary:
      'Submit a contact-us query (public) — payment issues, ID card upload issues, etc.',
  })
  create(@Body() dto: CreateContactQueryDto) {
    return this.contactService.create(dto);
  }

  @Roles(Role.ADMIN)
  @Get('admin')
  @ApiOperation({
    summary:
      'List client queries (filter with ?status=OPEN|RESOLVED, ?q, ?page, ?pageSize)',
  })
  list(
    @Query('status') status?: 'OPEN' | 'RESOLVED',
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.contactService.list(status, q, page, pageSize);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:id')
  @ApiOperation({
    summary: 'Resolve/reopen a query and attach an internal note',
  })
  update(@Param('id') id: string, @Body() dto: ResolveContactQueryDto) {
    return this.contactService.update(id, dto);
  }
}
