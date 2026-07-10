import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto/company.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('company')
export class CompanyController {
  constructor(private company: CompanyService) {}

  /** Public so the login screen can show the company's branding before authentication. */
  @Public()
  @Get()
  get() {
    return this.company.get();
  }

  @Patch()
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  update(@Body() dto: UpdateCompanyDto, @CurrentUser() user: AuthUser) {
    return this.company.update(dto, user.id);
  }
}
