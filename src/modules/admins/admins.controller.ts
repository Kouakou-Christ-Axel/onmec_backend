import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AdminRole } from '../../generated/prisma/client';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/auth/guards/admin.guard';
import { AdminRolesGuard } from 'src/modules/auth/guards/admin-roles.guard';
import { AdminRoles } from 'src/modules/auth/decorators/admin-roles.decorator';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { AuthenticatedActor } from 'src/common/types/authenticated-actor';
import { AdminsService } from './admins.service';
import {
  AdminResponseDto,
  CreateAdminDto,
  SearchAdminDto,
  UpdateAdminDto,
  UpdateAdminStatutDto,
} from './dto/admin.dto';

/**
 * Gestion des comptes back-office.
 * Réservée à l'administrateur national, au niveau de la classe entière.
 */
@ApiTags('Administrateurs')
@ApiBearerAuth('JWT')
@Controller('admins')
@UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
@AdminRoles(AdminRole.ADMIN_NATIONAL)
@ApiForbiddenResponse({ description: "Réservé à l'administrateur national" })
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post()
  @ApiOperation({
    summary: 'Créer un compte back-office',
    description:
      'Le mot de passe est généré par le serveur et retourné une seule fois. Le titulaire devra le changer à sa première connexion.',
  })
  @ApiBody({ type: CreateAdminDto })
  @ApiCreatedResponse({ description: 'Compte créé', type: AdminResponseDto })
  @ApiConflictResponse({ description: 'Email déjà utilisé' })
  create(@Body() dto: CreateAdminDto) {
    return this.adminsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des comptes back-office' })
  @ApiOkResponse({ description: 'Liste paginée' })
  findAll(@Query() query: SearchAdminDto) {
    return this.adminsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un compte back-office' })
  @ApiParam({ name: 'id', description: 'Identifiant du compte' })
  @ApiOkResponse({ description: 'Compte récupéré', type: AdminResponseDto })
  @ApiNotFoundResponse({ description: 'Compte non trouvé' })
  findOne(@Param('id') id: string) {
    return this.adminsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier un compte back-office',
    description: 'Permet notamment de changer le rôle.',
  })
  @ApiParam({ name: 'id', description: 'Identifiant du compte' })
  @ApiBody({ type: UpdateAdminDto })
  @ApiOkResponse({ description: 'Compte mis à jour', type: AdminResponseDto })
  @ApiNotFoundResponse({ description: 'Compte non trouvé' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminDto,
    @CurrentUser() actor: AuthenticatedActor,
  ) {
    return this.adminsService.update(id, dto, actor);
  }

  @Patch(':id/statut')
  @ApiOperation({ summary: 'Activer ou désactiver un compte back-office' })
  @ApiParam({ name: 'id', description: 'Identifiant du compte' })
  @ApiBody({ type: UpdateAdminStatutDto })
  @ApiOkResponse({ description: 'Statut mis à jour', type: AdminResponseDto })
  setActive(
    @Param('id') id: string,
    @Body() dto: UpdateAdminStatutDto,
    @CurrentUser() actor: AuthenticatedActor,
  ) {
    return this.adminsService.setActive(id, dto, actor);
  }

  @Post(':id/reset-password')
  @ApiOperation({
    summary: 'Réinitialiser le mot de passe d’un administrateur',
    description: 'Génère un mot de passe temporaire, retourné une seule fois.',
  })
  @ApiParam({ name: 'id', description: 'Identifiant du compte' })
  @ApiOkResponse({ description: 'Nouveau mot de passe généré' })
  resetPassword(@Param('id') id: string) {
    return this.adminsService.resetPassword(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer un compte back-office',
    description:
      'Suppression logique : les contenus publiés par ce compte conservent leur auteur.',
  })
  @ApiParam({ name: 'id', description: 'Identifiant du compte' })
  @ApiOkResponse({ description: 'Compte supprimé', type: AdminResponseDto })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedActor) {
    return this.adminsService.remove(id, actor);
  }
}
