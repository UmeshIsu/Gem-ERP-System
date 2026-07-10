import { Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('unreadOnly') unreadOnly?: string) {
    return this.notifications.listForUser(user.id, unreadOnly === 'true');
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.id);
  }

  @Post(':id/read')
  markRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }
}
