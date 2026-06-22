import { Module } from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { SignalementEngagementController } from './signalement-engagement.controller';
import { ActualiteEngagementController } from './actualite-engagement.controller';
import { CommentaireModerationController } from './commentaire-moderation.controller';

@Module({
  controllers: [
    SignalementEngagementController,
    ActualiteEngagementController,
    CommentaireModerationController,
  ],
  providers: [EngagementService],
  exports: [EngagementService],
})
export class EngagementModule {}
