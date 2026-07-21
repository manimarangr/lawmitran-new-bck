import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserPayload } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { EStampService } from './estamp.service';

@ApiTags('estamp')
@Controller()
export class EStampController {
  constructor(private readonly estamp: EStampService) {}

  @Post('documents/:id/estamp')
  @ApiOperation({
    summary: 'Start an e-stamp request for a document (provider-agnostic)',
  })
  start(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { stateCode?: string; amount?: number },
  ) {
    return this.estamp.createForDocument(user.userId, id, {
      stateCode: body?.stateCode,
      amount: body?.amount,
    });
  }

  @Get('estamp/:id/status')
  @ApiOperation({ summary: 'e-stamp request status' })
  status(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.estamp.getStatus(user.userId, id);
  }

  @Public()
  @Post('webhooks/estamp')
  @ApiOperation({
    summary: 'Generic e-stamp webhook; dispatched to the owning provider',
  })
  webhook(@Body() body: unknown) {
    return this.estamp.handleWebhook(body);
  }

  @Post('estamp/:id/simulate')
  @ApiOperation({ summary: 'Testing only: simulate a mock provider callback' })
  simulate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { outcome?: string },
  ) {
    return this.estamp.simulate(user.userId, id, body?.outcome ?? 'stamped');
  }
}
