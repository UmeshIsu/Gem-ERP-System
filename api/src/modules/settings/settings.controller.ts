import { Body, Controller, Delete, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SettingsService } from './settings.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  /** Master data lists are readable by all authenticated users (needed for form dropdowns). */
  @Get('master/:entity')
  list(@Param('entity') entity: string, @Query('includeInactive') includeInactive?: string) {
    return this.settings.list(this.settings.validateEntity(entity), includeInactive === 'true');
  }

  @Post('master/:entity')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
  create(@Param('entity') entity: string, @Body() body: Record<string, unknown>, @CurrentUser() user: AuthUser) {
    return this.settings.create(this.settings.validateEntity(entity), body, user.id);
  }

  @Patch('master/:entity/:id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
  update(
    @Param('entity') entity: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.settings.update(this.settings.validateEntity(entity), id, body, user.id);
  }

  @Delete('master/:entity/:id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
  deactivate(@Param('entity') entity: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.settings.deactivate(this.settings.validateEntity(entity), id, user.id);
  }

  @Post('master/:entity/:id/reactivate')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
  reactivate(@Param('entity') entity: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.settings.reactivate(this.settings.validateEntity(entity), id, user.id);
  }

  @Get('backup')
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  @Header('Content-Disposition', 'attachment; filename="aura-gem-erp-backup.json"')
  backup() {
    return this.settings.backup();
  }
}
