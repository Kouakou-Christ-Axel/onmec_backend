import {ApiProperty} from "@nestjs/swagger";
import {IsDate, IsString, IsUrl} from "class-validator";

export class CreateActualiteDto {
	@ApiProperty({
		description:"Date de l'actualité",
		example: "2023-10-15T14:48:00.000Z"
	})
	@IsDate()
	date: Date;

	@ApiProperty({
		description:"Extrait de l'actualité",
		example: "Ceci est un extrait de l'actualité."
	})
	@IsString()
	excerpt: string;

	@ApiProperty({
		description:"Titre de l'actualité",
		example: "Titre de l'actualité"
	})
	@IsString()
	title: string;

	@ApiProperty({
		description:"Contenu complet de l'actualité",
		example: "Ceci est le contenu complet de l'actualité."
	})
	@IsString()
	content: string;
}
