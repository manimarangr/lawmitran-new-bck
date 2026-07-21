import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PropertyService } from './property.service';

class CreateCaseDto {
  @IsString()
  @MinLength(2)
  state: string;

  @IsString()
  @MinLength(2)
  city: string;

  @IsIn([
    'FLAT_PURCHASE',
    'SITE_PURCHASE',
    'RESALE_HOUSE',
    'AGRICULTURAL_LAND',
    'OTHER',
  ])
  transactionType: string;
}

class SetDocumentDto {
  @IsString()
  docType: string;

  // multipart sends strings — coerce
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  provided?: boolean;
}

class RequestOpinionDto {
  @IsString()
  lawyerId: string;
}

@ApiTags('property')
@Controller('property')
export class PropertyController {
  constructor(private propertyService: PropertyService) {}

  @Public()
  @Get('checklists')
  @ApiOperation({
    summary: 'Document checklist for ?state=&type= (public, informational)',
  })
  checklist(@Query('state') state = 'ANY', @Query('type') type = 'OTHER') {
    return this.propertyService.getChecklist(state, type);
  }

  @Public()
  @Get('transaction-types')
  transactionTypes() {
    return this.propertyService.listTransactionTypes();
  }

  @Post('cases')
  @ApiOperation({ summary: 'Start a property document check' })
  createCase(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateCaseDto,
  ) {
    return this.propertyService.createCase(user.userId, dto);
  }

  @Get('cases/me')
  myCases(@CurrentUser() user: CurrentUserPayload) {
    return this.propertyService.myCases(user.userId);
  }

  @Get('cases/:id')
  myCase(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.propertyService.myCase(user.userId, id);
  }

  @Post('cases/:id/documents')
  @ApiOperation({
    summary:
      'Tick a checklist item, optionally attaching a scan (multipart "file")',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  setDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: SetDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.propertyService.setDocument(
      user.userId,
      id,
      dto.docType,
      dto.provided ?? true,
      file,
    );
  }

  @Post('cases/:id/analyze')
  @ApiOperation({
    summary: 'Run the deterministic checklist analysis (not legal advice)',
  })
  analyze(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.propertyService.analyze(user.userId, id);
  }

  @Get('cases/:id/lawyers')
  @ApiOperation({ summary: 'Verified property lawyers serving the case city' })
  suggestLawyers(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.propertyService.suggestLawyers(user.userId, id);
  }

  @Post('cases/:id/request-opinion')
  @ApiOperation({
    summary: 'Send the case summary to a chosen lawyer as a lead',
  })
  requestOpinion(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: RequestOpinionDto,
  ) {
    return this.propertyService.requestOpinion(user.userId, id, dto.lawyerId);
  }
}
