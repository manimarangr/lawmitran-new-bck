import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { NotifyModule } from './common/notify/notify.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AuditModule } from './common/audit/audit.module';
import { AdminScopeGuard } from './common/guards/admin-scope.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RateLimitGuard } from './common/security/rate-limit.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LawyersModule } from './modules/lawyers/lawyers.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AdminModule } from './modules/admin/admin.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { LeadsModule } from './modules/leads/leads.module';
import { AiIntakeModule } from './modules/ai-intake/ai-intake.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { SeoModule } from './modules/seo/seo.module';
import { ESignModule } from './common/esign/esign.module';
import { EStampModule } from './common/estamp/estamp.module';
import { PropertyModule } from './modules/property/property.module';
import { ContactModule } from './modules/contact/contact.module';
import { ContentModule } from './modules/content/content.module';
import { DiaryModule } from './modules/diary/diary.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    NotifyModule,
    SettingsModule,
    AuditModule,
    AuthModule,
    UsersModule,
    LawyersModule,
    DocumentsModule,
    AdminModule,
    SubscriptionsModule,
    LeadsModule,
    AiIntakeModule,
    RatingsModule,
    SeoModule,
    ContactModule,
    PropertyModule,
    ContentModule,
    DiaryModule,
    ESignModule,
    EStampModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: AdminScopeGuard },
  ],
})
export class AppModule {}
