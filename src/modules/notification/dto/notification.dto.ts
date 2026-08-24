import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class NotificationDto {
  @ApiProperty({
    type: String,
    description: "Client device token",
  })
  token: string;

  @ApiProperty({
    type: String,
    description: "Notification Title",
  })
  title: string;

  @ApiProperty({
    type: String,
    description: "Notification Body",
  })
  body: string;

  @ApiPropertyOptional({
    type: String,
    description: "Notification Icon / Logo",
  })
  icon: string;
}

export class MultipleDeviceNotificationDto extends PickType(NotificationDto, [
  "title",
  "body",
  "icon",
]) {
  @ApiProperty({
    type: String,
    description: "Clients device token",
  })
  tokens: string[];
}

export class TopicNotificationDto extends PickType(NotificationDto, [
  "title",
  "body",
  "icon",
]) {
  @ApiProperty({
    type: String,
    description: "Subscription topic to send to",
  })
  topic: string;
}

// ─── Fil in-app ──────────────────────────────────────────────────────────────

export class NotificationListQueryDto {
  @ApiPropertyOptional({ description: 'Page courante', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Éléments par page',
    example: 20,
    default: 20,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // `@Type(() => String)` est indispensable : le ValidationPipe global tourne
  // avec `enableImplicitConversion`, qui coerce d'apres le type declare AVANT
  // que `@Transform` ne s'execute. Sans lui, `?nonLues=false` filtrerait quand
  // meme (meme piege que `hasImage` sur les actualites).
  @ApiPropertyOptional({
    description: 'Ne retourner que les notifications non lues',
    example: true,
  })
  @IsOptional()
  @Type(() => String)
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return undefined;
  })
  @IsBoolean()
  nonLues?: boolean;
}

export class NotificationResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Nouvelle actualité' })
  title: string;

  @ApiProperty({ example: 'Inauguration du nouveau pont d’Abidjan' })
  body: string;

  @ApiProperty({
    nullable: true,
    description:
      "Nature de la notification. Valeurs émises : actualite_publiee, signalement_statut, signalement_commentaire, commentaire_modere. L'historique peut porter d'autres valeurs.",
    example: 'actualite_publiee',
  })
  type: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Chemin côté front vers le contenu concerné',
    example: '/actualites/inauguration-du-nouveau-pont',
  })
  lien: string | null;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ nullable: true, example: null })
  readAt: Date | null;

  @ApiProperty({ example: '2026-08-24T09:00:00.000Z' })
  createdAt: Date;
}

export class PaginatedNotificationsDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data: NotificationResponseDto[];

  @ApiProperty({ description: 'Total correspondant au filtre', example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({
    description: 'Nombre de notifications non lues, tous filtres confondus',
    example: 3,
  })
  nonLues: number;
}
