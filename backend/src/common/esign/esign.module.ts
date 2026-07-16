import { Module } from '@nestjs/common';
import { ESIGN_PROVIDERS } from './esign-provider.interface';
import { ESignController } from './esign.controller';
import { ESignService } from './esign.service';
import { MockESignProvider } from './providers/mock/mock-esign.provider';

/**
 * e-Sign module. Register additional provider adapters by adding them to
 * `providers` and to the ESIGN_PROVIDERS factory's inject list - nothing else
 * changes. PrismaModule, SettingsModule, and NotifyModule are global.
 */
@Module({
  controllers: [ESignController],
  providers: [
    ESignService,
    MockESignProvider,
    {
      provide: ESIGN_PROVIDERS,
      useFactory: (mock: MockESignProvider) => [mock],
      inject: [MockESignProvider],
    },
  ],
  exports: [ESignService],
})
export class ESignModule {}
