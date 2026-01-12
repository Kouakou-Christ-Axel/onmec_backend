import {Actualite} from "@prisma/client";

export class ActualiteEntity implements Actualite {
	id: string;
	slug: string;
	date: Date;
	excerpt: string;
	imageUrl: string | null;
	title: string;
	content: string;
	createdAt: Date;
	updatedAt: Date;
}
