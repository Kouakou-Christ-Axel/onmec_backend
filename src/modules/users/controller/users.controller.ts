import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminRole } from '../../../generated/prisma/client';
import { GenerateConfigService } from 'src/common/services/generate-config.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/auth/guards/admin.guard';
import { AdminRolesGuard } from 'src/modules/auth/guards/admin-roles.guard';
import { AdminRoles } from 'src/modules/auth/decorators/admin-roles.decorator';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { AuthenticatedActor } from 'src/common/types/authenticated-actor';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';
import { UpdateUserPasswordDto } from 'src/modules/users/dto/update-user-password.dto';
import { UpdateUserDto } from 'src/modules/users/dto/update-user.dto';
import { UpdateMemberStatutDto } from 'src/modules/users/dto/update-member-statut.dto';
import { SearchUserDto } from 'src/modules/users/dto/search-user.dto';
import { UsersService } from 'src/modules/users/services/users.service';
import { ResetUserPasswordResponseDto } from '../dto/reset-user-password.dto';
import { UserResponseDto } from '../dto/user-response.dto';

const AVATAR_UPLOAD = GenerateConfigService.generateConfigSingleImageUpload(
  './uploads/users-avatar',
);

const AVATAR_COMPRESSION = { quality: 70, width: 600, fit: 'inside' } as const;

/**
 * Comptes membres.
 *
 * Le chemin `users` est conservé volontairement : le front web est déjà livré
 * et appelle ces routes. Les comptes back-office vivent sous `/admins`.
 *
 * Avant cette révision, 13 des 14 routes n'exigeaient qu'un JWT valide : tout
 * membre connecté pouvait lire l'annuaire complet, modifier n'importe quel
 * profil, verrouiller ou supprimer définitivement n'importe quel compte.
 */
@ApiTags('Utilisateurs')
@ApiBearerAuth('JWT')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private async resolveAvatar(image?: Express.Multer.File) {
    if (!image?.path) return undefined;
    const resized = await GenerateConfigService.compressImages(
      { img_1: image.path },
      undefined,
      AVATAR_COMPRESSION,
      true,
    );
    return resized?.['img_1'] ?? image.path;
  }

  // ── ADMINISTRATION DES MEMBRES ───────────────────────────────────────────

  @Post()
  @UseGuards(AdminGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.ADMIN_NATIONAL)
  @UseInterceptors(FileInterceptor('image', { ...AVATAR_UPLOAD }))
  @ApiOperation({
    summary: 'Créer un compte membre',
    description:
      "Réservé à l'administrateur national. Le mot de passe est généré par le serveur et retourné une seule fois. Cette route ne permet plus de créer un administrateur : les comptes back-office se créent via POST /admins.",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ description: 'Membre créé', type: UserResponseDto })
  @ApiConflictResponse({ description: 'Email déjà utilisé' })
  @ApiForbiddenResponse({ description: "Réservé à l'administrateur national" })
  async create(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    return this.usersService.createMember({
      ...createUserDto,
      image: await this.resolveAvatar(image),
    });
  }

  @Post('member')
  @UseGuards(AdminGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.ADMIN_NATIONAL)
  @UseInterceptors(FileInterceptor('image', { ...AVATAR_UPLOAD }))
  @ApiOperation({
    summary: 'Créer un compte membre (alias de POST /users)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ description: 'Membre créé', type: UserResponseDto })
  @ApiConflictResponse({ description: 'Email déjà utilisé' })
  async createMember(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    return this.usersService.createMember({
      ...createUserDto,
      image: await this.resolveAvatar(image),
    });
  }

  // ── PROFIL DU COMPTE CONNECTÉ ────────────────────────────────────────────
  // Déclaré avant `:id/profile` — sans effet de collision ici, mais l'ordre
  // reste significatif pour le matching Nest.

  @Get('detail')
  @ApiOperation({
    summary: 'Mon profil',
    description: 'Profil du membre authentifié.',
  })
  @ApiOkResponse({ description: 'Profil récupéré', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  detail(@CurrentUser() actor: AuthenticatedActor) {
    this.assertMember(actor);
    return this.usersService.detail(actor);
  }

  @Get()
  @UseGuards(AdminGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.ADMIN_NATIONAL, AdminRole.MODERATEUR)
  @ApiOperation({
    summary: 'Liste des membres',
    description:
      "Annuaire des comptes membres, avec pagination et filtres. Réservé à l'administrateur national et au modérateur.",
  })
  @ApiOkResponse({ description: 'Liste paginée récupérée' })
  @ApiForbiddenResponse({ description: 'Rôle insuffisant' })
  findAll(@Query() query: SearchUserDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id/profile')
  @ApiOperation({
    summary: "Détail d'un membre",
    description: 'Accessible au membre lui-même, à l’administrateur national et au modérateur.',
  })
  @ApiParam({ name: 'id', description: 'Identifiant du membre' })
  @ApiOkResponse({ description: 'Membre récupéré', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  findOneById(@Param('id') id: string, @CurrentUser() actor: AuthenticatedActor) {
    this.assertSelfOrRoles(actor, id, [
      AdminRole.ADMIN_NATIONAL,
      AdminRole.MODERATEUR,
    ]);
    return this.usersService.findOneById(id);
  }

  @Patch(':id/profile')
  @UseGuards(AdminGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.ADMIN_NATIONAL, AdminRole.MODERATEUR)
  @ApiOperation({ summary: 'Mettre à jour le profil d’un membre' })
  @ApiParam({ name: 'id', description: 'Identifiant du membre' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ description: 'Membre mis à jour', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  updateById(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateById(id, updateUserDto);
  }

  @Patch(':id/statut')
  @UseGuards(AdminGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.ADMIN_NATIONAL, AdminRole.MODERATEUR)
  @ApiOperation({
    summary: 'Suspendre, bannir ou réactiver un membre',
    description:
      'Remplace PATCH /users/:id/lock. La suspension est effective immédiatement, y compris sur les tokens déjà émis.',
  })
  @ApiParam({ name: 'id', description: 'Identifiant du membre' })
  @ApiBody({ type: UpdateMemberStatutDto })
  @ApiOkResponse({ description: 'Statut mis à jour', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  setStatut(
    @Param('id') id: string,
    @Body() dto: UpdateMemberStatutDto,
    @CurrentUser() actor: AuthenticatedActor,
  ) {
    return this.usersService.setStatut(id, dto, actor);
  }

  @Delete(':id')
  @UseGuards(AdminGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.ADMIN_NATIONAL)
  @ApiOperation({
    summary: 'Supprimer un membre (réversible)',
    description: 'Suppression logique. Restaurable via POST /users/restore/:id.',
  })
  @ApiParam({ name: 'id', description: 'Identifiant du membre' })
  @ApiOkResponse({ description: 'Membre supprimé', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  removeById(@Param('id') id: string) {
    return this.usersService.softDeleteById(id);
  }

  @Patch(':id/reset-password')
  @UseGuards(AdminGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.ADMIN_NATIONAL)
  @ApiOperation({
    summary: 'Réinitialiser le mot de passe d’un membre',
    description: 'Génère un mot de passe temporaire, retourné une seule fois.',
  })
  @ApiParam({ name: 'id', description: 'Identifiant du membre' })
  @ApiOkResponse({
    description: 'Nouveau mot de passe généré',
    type: ResetUserPasswordResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  async resetPassword(@Param('id') userId: string) {
    return this.usersService.resetPassword(userId);
  }

  @Post('restore/:id')
  @UseGuards(AdminGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.ADMIN_NATIONAL)
  @ApiOperation({ summary: 'Restaurer un compte supprimé' })
  @ApiParam({ name: 'id', description: 'Identifiant du membre' })
  @ApiOkResponse({ description: 'Compte restauré', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  async restore(@Param('id') id: string) {
    return this.usersService.restore(id);
  }

  @Delete('/delete/:id')
  @UseGuards(AdminGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.ADMIN_NATIONAL)
  @ApiOperation({
    summary: 'Supprimer définitivement un membre',
    description:
      'Irréversible. Purge au préalable les quiz passés et les notifications, qui sont en ON DELETE RESTRICT.',
  })
  @ApiParam({ name: 'id', description: 'Identifiant du membre' })
  @ApiOkResponse({ description: 'Compte supprimé définitivement' })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  async delete(@Param('id') id: string) {
    return this.usersService.removeById(id);
  }

  // ── SELF-SERVICE MEMBRE ──────────────────────────────────────────────────

  @Patch()
  @UseInterceptors(FileInterceptor('image', { ...AVATAR_UPLOAD }))
  @ApiOperation({ summary: 'Mettre à jour mon profil' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ description: 'Profil mis à jour', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Données invalides' })
  async update(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    this.assertMember(actor);
    return this.usersService.update(actor, {
      ...updateUserDto,
      image: await this.resolveAvatar(image),
    });
  }

  @Patch('password')
  @ApiOperation({ summary: 'Changer mon mot de passe' })
  @ApiBody({ type: UpdateUserPasswordDto })
  @ApiOkResponse({ description: 'Mot de passe mis à jour' })
  @ApiBadRequestResponse({ description: 'Mot de passe actuel incorrect' })
  async updatePassword(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: UpdateUserPasswordDto,
  ) {
    this.assertMember(actor);
    return this.usersService.updatePassword(actor, dto);
  }

  @Delete()
  @ApiOperation({
    summary: 'Supprimer mon compte',
    description: 'Suppression logique du compte du membre authentifié.',
  })
  @ApiOkResponse({ description: 'Compte supprimé', type: UserResponseDto })
  async partialDelete(@CurrentUser() actor: AuthenticatedActor) {
    this.assertMember(actor);
    return this.usersService.partialRemove(actor);
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────

  /** Les routes self-service n'ont pas de sens pour un compte back-office. */
  private assertMember(actor: AuthenticatedActor) {
    if (actor.type !== 'member') {
      throw new ForbiddenException(
        'Cette route concerne les comptes membres. Utilisez /auth/admin/me pour un compte back-office.',
      );
    }
  }

  private assertSelfOrRoles(
    actor: AuthenticatedActor,
    targetId: string,
    roles: AdminRole[],
  ) {
    if (actor.type === 'member' && actor.id === targetId) return;
    if (actor.type === 'admin' && roles.includes(actor.role as AdminRole)) return;
    throw new ForbiddenException("Accès refusé à ce profil");
  }
}
