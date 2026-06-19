import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { UserRoles } from 'src/common/decorators/user-roles.decorator';
import { UserRolesGuard } from 'src/common/guards/user-roles.guard';
import { GenerateConfigService } from 'src/common/services/generate-config.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';
import { UpdateUserPasswordDto } from 'src/modules/users/dto/update-user-password.dto';
import { UpdateUserDto } from 'src/modules/users/dto/update-user.dto';
import { SearchUserDto } from 'src/modules/users/dto/search-user.dto';
import { UsersService } from 'src/modules/users/services/users.service';
import { ResetUserPasswordResponseDto } from '../dto/reset-user-password.dto';
import { UserResponseDto } from '../dto/user-response.dto';

@ApiTags('Utilisateurs')
@ApiBearerAuth('JWT')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // CREATE USER
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', { ...GenerateConfigService.generateConfigSingleImageUpload('./uploads/users-avatar') }))
  @ApiOperation({ summary: 'Créer un utilisateur (Admin)', description: 'Crée un nouveau compte utilisateur avec avatar optionnel. Nécessite d\'être authentifié.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ description: 'Utilisateur créé avec succès', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Email déjà utilisé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  async create(@Req() req: Request, @Body() createUserDto: CreateUserDto, @UploadedFile() image: Express.Multer.File) {
    const resizedPath = await GenerateConfigService.compressImages(
      { "img_1": image?.path },
      undefined,
      {
        quality: 70,
        width: 600,
        fit: 'inside',
      },
      true,
    );
    return this.usersService.create(req, { ...createUserDto, image: resizedPath!["img_1"] ?? image?.path });
  }

  // CREATE MEMBER
  @Post('member')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', { ...GenerateConfigService.generateConfigSingleImageUpload('./uploads/users-avatar') }))
  @ApiOperation({ summary: 'Créer un membre', description: 'Crée un nouveau compte membre avec avatar optionnel.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ description: 'Membre créé avec succès', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Email déjà utilisé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  async createMember(@Req() req: Request, @Body() createUserDto: CreateUserDto, @UploadedFile() image: Express.Multer.File) {
    const resizedPath = await GenerateConfigService.compressImages(
      { "img_1": image?.path },
      undefined,
      {
        quality: 70,
        width: 600,
        fit: 'inside',
      },
      true,
    );
    return this.usersService.createMember(req, { ...createUserDto, image: resizedPath!["img_1"] ?? image?.path });
  }
  // GET DETAIL USER
  @Get('detail')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mon profil', description: 'Retourne le profil de l\'utilisateur authentifié.' })
  @ApiOkResponse({ description: 'Profil récupéré', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  detail(@Req() req: Request) {
    return this.usersService.detail(req);
  }

  // GET ALL USERS
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Liste des utilisateurs', description: 'Retourne les utilisateurs avec pagination et filtres optionnels (recherche, rôle, état).' })
  @ApiOkResponse({
    description: 'Liste paginée récupérée',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginatedResponseDto' },
        { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/UserResponseDto' } } } },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  findAll(@Query() query: SearchUserDto) {
    return this.usersService.findAll(query);
  }

  // GET ONE USER (par id - Admin)
  @Get(':id/profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Détail d\'un utilisateur', description: 'Retourne le profil d\'un utilisateur par son identifiant.' })
  @ApiParam({ name: 'id', description: 'Identifiant de l\'utilisateur', example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Utilisateur récupéré', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  findOneById(@Param('id') id: string) {
    return this.usersService.findOneById(id);
  }

  // UPDATE ONE USER (par id - Admin)
  @Patch(':id/profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mettre à jour un utilisateur (Admin)', description: 'Met à jour le profil d\'un utilisateur par son identifiant.' })
  @ApiParam({ name: 'id', description: 'Identifiant de l\'utilisateur', example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ description: 'Utilisateur mis à jour', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  updateById(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateById(id, updateUserDto);
  }

  // LOCK / UNLOCK USER (par id - Admin)
  @Patch(':id/lock')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verrouiller / déverrouiller un utilisateur (Admin)', description: 'Active ou désactive un compte utilisateur.' })
  @ApiParam({ name: 'id', description: 'Identifiant de l\'utilisateur', example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiBody({ schema: { properties: { locked: { type: 'boolean', example: true } } } })
  @ApiOkResponse({ description: 'État du compte mis à jour', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  setLockState(@Param('id') id: string, @Body('locked') locked: boolean) {
    return this.usersService.setLockState(id, locked);
  }

  // DELETE ONE USER (par id - Admin)
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Supprimer un utilisateur (Admin)', description: 'Suppression définitive d\'un utilisateur par son identifiant.' })
  @ApiParam({ name: 'id', description: 'Identifiant de l\'utilisateur', example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Utilisateur supprimé' })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  removeById(@Param('id') id: string) {
    return this.usersService.removeById(id);
  }

  // UPDATE USER
  @Patch()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', { ...GenerateConfigService.generateConfigSingleImageUpload('./uploads/users-avatar') }))
  @ApiOperation({ summary: 'Mettre à jour mon profil' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ description: 'Profil mis à jour', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Données invalides' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  async update(@Req() req: Request, @Body() updateUserDto: UpdateUserDto, @UploadedFile() image: Express.Multer.File) {
    const resizedPath = await GenerateConfigService.compressImages(
      { "img_1": image?.path },
      undefined,
      {
        quality: 70,
        width: 600,
        fit: 'inside',
      },
      true,
    );
    return this.usersService.update(req, { ...updateUserDto, image: resizedPath!["img_1"] ?? image?.path });
  }

  // UPDATE PASSWORD
  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Changer mon mot de passe' })
  @ApiBody({ type: UpdateUserPasswordDto })
  @ApiOkResponse({ description: 'Mot de passe mis à jour' })
  @ApiBadRequestResponse({ description: 'Mot de passe actuel incorrect' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  async updatePassword(
    @Req() req: Request,
    @Body() updateUserPasswordDto: UpdateUserPasswordDto,
  ) {
    return this.usersService.updatePassword(req, updateUserPasswordDto);
  }
  // RESET PASSWORD (Admin)
  @Patch(':id/reset-password')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @UserRoles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe (Admin)', description: 'Génère un nouveau mot de passe temporaire pour l\'utilisateur spécifié.' })
  @ApiParam({ name: 'id', description: 'Identifiant de l\'utilisateur', example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Nouveau mot de passe généré', type: ResetUserPasswordResponseDto })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Réservé aux administrateurs' })
  async resetPassword(
    @Req() req: Request,
    @Param('id') user_id: string,
  ) {
    return this.usersService.resetPassword(req, user_id);
  }

  // PARTIAL DELETE
  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Désactiver mon compte', description: 'Soft delete du compte de l\'utilisateur authentifié.' })
  @ApiOkResponse({ description: 'Compte désactivé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  async partialDelete(@Req() req: Request) {
    return this.usersService.partialRemove(req);
  }

  // RESTAURATION
  @Post('restore/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Restaurer un compte', description: 'Réactive un compte préalablement désactivé.' })
  @ApiParam({ name: 'id', description: 'Identifiant de l\'utilisateur', example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Compte restauré', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  async restore(@Req() req: Request, @Param('id') id: string) {
    return this.usersService.restore(req, id);
  }

  // DELETE
  @Delete('/delete/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Supprimer définitivement (Admin)', description: 'Suppression permanente et irréversible du compte.' })
  @ApiParam({ name: 'id', description: 'Identifiant de l\'utilisateur', example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Compte supprimé définitivement' })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  async delete(@Req() req: Request, @Param('id') id: string) {
    return this.usersService.remove(req, id);
  }
}
