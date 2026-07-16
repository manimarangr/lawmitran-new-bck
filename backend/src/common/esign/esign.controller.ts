import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserPayload } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { ESignService } from './esign.service';

@ApiTags('esign')
@Controller()
export class ESignController {
  constructor(private readonly esign: ESignService) {}

  @Post('documents/:id/esign')
  @ApiOperation({ summary: 'Start an e-sign request for a document (provider-agnostic)' })
  start(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.esign.createForDocument(user.userId, id);
  }

  @Get('esign/:id/status')
  @ApiOperation({ summary: 'e-sign request status' })
  status(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.esign.getStatus(user.userId, id);
  }

  @Public()
  @Post('webhooks/esign')
  @ApiOperation({ summary: 'Generic e-sign webhook; dispatched to the owning provider' })
  webhook(@Body() body: unknown) {
    return this.esign.handleWebhook(body);
  }

  @Post('esign/:id/simulate')
  @ApiOperation({ summary: 'Testing only: simulate a mock provider callback' })
  simulate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { outcome?: string },
  ) {
    return this.esign.simulate(user.userId, id, body?.outcome ?? 'signed');
  }
}
