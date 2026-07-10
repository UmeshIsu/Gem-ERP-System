import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SplittingService } from './splitting.service';
import { SplitStoneDto } from './dto/split.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('stones/:id/split')
export class SplittingController {
  constructor(private splitting: SplittingService) {}

  @Post()
  @Roles(Role.MANAGER, Role.INVENTORY_OFFICER)
  split(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SplitStoneDto, @CurrentUser() user: AuthUser) {
    return this.splitting.split(id, dto, user.id);
  }

  @Get()
  getSplitEvent(@Param('id', ParseUUIDPipe) id: string) {
    return this.splitting.getSplitEvent(id);
  }
}
