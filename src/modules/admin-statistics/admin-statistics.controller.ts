import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '../../generated/prisma/client';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/auth/guards/admin.guard';
import { AdminRolesGuard } from 'src/modules/auth/guards/admin-roles.guard';
import { AdminRoles } from 'src/modules/auth/decorators/admin-roles.decorator';
import { AdminStatisticsService } from './admin-statistics.service';
import { AdminStatisticsDto } from './dto/admin-statistics.dto';

@ApiTags('Statistiques Administrateur')
@ApiBearerAuth('JWT')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
@AdminRoles(AdminRole.ADMIN_NATIONAL)
@ApiForbiddenResponse({ description: "Réservé à l'administrateur national" })
export class AdminStatisticsController {
  constructor(private readonly adminStatisticsService: AdminStatisticsService) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Statistiques agrégées du dashboard admin' })
  @ApiOkResponse({ description: 'Statistiques récupérées', type: AdminStatisticsDto })
  getStatistics() {
    return this.adminStatisticsService.getStatistics();
  }
}
