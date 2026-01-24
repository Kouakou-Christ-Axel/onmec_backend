import {ApiProperty} from '@nestjs/swagger';
import {IsOptional, IsString} from 'class-validator';

export class SearchDocumentDto {
	@ApiProperty({
		description: 'Titre du document à rechercher',
		example: 'Le Petit Prince',
	})
	@IsString({
		message: 'Le titre doit être une chaîne de caractères',
	})
	@IsOptional()
	title?: string;

	@ApiProperty({
		description: 'Page de résultats à récupérer',
		example: 1,
		default: 1,
	})
	@IsOptional()
	page?: number = 1;

	@ApiProperty({
		description: 'Nombre de résultats par page',
		example: 20,
		default: 20,
	})
	@IsOptional()
	limit?: number = 10;
}