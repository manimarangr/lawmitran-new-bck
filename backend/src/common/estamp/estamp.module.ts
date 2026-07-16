import { Module } from '@nestjs/common';
import { ESTAMP_PROVIDERS } from './estamp-provider.interface';
import { EStampController } from './estamp.controller';
import { EStampService } from './estamp.service';
import { MockEStampProvider } from './providers/mock/mock-estamp.provider';

@Module({
  controllers: [EStampController],
  providers: [
    EStampService,
    MockEStampProvider,
    {
      provide: ESTAMP_PROVIDERS,
      useFactory: (mock: MockEStampProvider) => [mock],
      inject: [MockEStampProvider],
    },
  ],
  exports: [EStampService],
})
export class EStampModule {}
