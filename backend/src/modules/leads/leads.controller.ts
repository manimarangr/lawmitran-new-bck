import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { WithdrawLeadDto } from './dto/withdraw-lead.dto';
import { LeadsService } from './leads.service';

@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Roles(Role.CLIENT)
  @Post()
  @ApiOperation({ summary: 'Submit a lead to a specific lawyer' })
  @ApiResponse({ status: 201, description: 'Lead created' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(user.userId, dto);
  }

  @Roles(Role.CLIENT)
  @Get('me')
  @ApiOperation({ summary: 'List leads submitted by the current client' })
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.listForClient(user.userId);
  }

  @Roles(Role.LAWYER)
  @Get('lawyer/me')
  @ApiOperation({ summary: 'List leads assigned to the current lawyer' })
  listForLawyer(@CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.listForLawyer(user.userId);
  }

  @Roles(Role.LAWYER)
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Advance the status of a lead assigned to the current lawyer',
  })
  updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.leadsService.updateStatus(user.userId, id, dto);
  }

  @Roles(Role.LAWYER)
  @Post(':id/reveal-contact')
  @ApiOperation({
    summary:
      "Reveal a lead's client contact (requires an active plan; logged for anti-abuse)",
  })
  @ApiResponse({ status: 201, description: 'Client mobile + email returned' })
  revealContact(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.leadsService.revealContact(user.userId, id);
  }

  @Roles(Role.CLIENT)
  @Post(':id/confirm-contact')
  @ApiOperation({
    summary: 'Client confirms the lawyer actually made contact',
  })
  @ApiResponse({ status: 201, description: 'Lead marked as client-confirmed contacted' })
  confirmContact(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.leadsService.confirmContact(user.userId, id);
  }

  @Roles(Role.CLIENT)
  @Patch(':id/withdraw')
  @ApiOperation({ summary: 'Client withdraws their requirement (closes the lead)' })
  @ApiResponse({ status: 200, description: 'Lead closed as withdrawn' })
  withdraw(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: WithdrawLeadDto,
  ) {
    return this.leadsService.withdraw(user.userId, id, dto.reason);
  }
}
