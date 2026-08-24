import {Actualite, StatutActualite} from "../../../generated/prisma/client";

export class ActualiteEntity implements Actualite {
	id: string;
	slug: string;
	date: Date;
	excerpt: string;
	imageUrl: string | null;
	title: string;
	content: string;
	statut: StatutActualite;
	publishedAt: Date | null;
	authorId: string | null;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
}
