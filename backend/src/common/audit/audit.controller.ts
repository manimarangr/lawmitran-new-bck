import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import { AdminScopes } from '../decorators/admin-scopes.decorator';
import { Roles } from '../decorators/roles.decorator';
import { paginate, resolvePagination } from '../pagination';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin/audit')
@Roles(Role.ADMIN)
@AdminScopes() // SUPER only
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Audit trail — ?q= matches action/summary/actor email',
  })
  async list(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const query = q?.trim();
    const where: Prisma.AuditLogWhereInput = query
      ? {
          OR: [
            { action: { contains: query, mode: 'insensitive' } },
            { summary: { contains: query, mode: 'insensitive' } },
            { entityId: { contains: query, mode: 'insensitive' } },
            {
              actor: {
                is: { email: { contains: query, mode: 'insensitive' } },
              },
            },
          ],
        }
      : {};
    const pg = resolvePagination(page, pageSize);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pg.skip,
        take: pg.take,
        include: { actor: { select: { email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginate(items, total, pg.page, pg.pageSize);
  }
}
