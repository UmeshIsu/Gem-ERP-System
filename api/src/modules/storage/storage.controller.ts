import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';

const FOLDERS = ['stones', 'treatments', 'certificates', 'exports', 'avatars', 'documents'];

@Controller('uploads')
export class StorageController {
  constructor(private storage: StorageService) {}

  private validateFolder(folder?: string): string {
    const f = folder ?? 'stones';
    if (!FOLDERS.includes(f)) throw new BadRequestException(`Invalid folder. Valid: ${FOLDERS.join(', ')}`);
    return f;
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @Query('folder') folder?: string) {
    return this.storage.store(file, this.validateFolder(folder));
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 20))
  uploadMany(@UploadedFiles() files: Express.Multer.File[], @Query('folder') folder?: string) {
    const f = this.validateFolder(folder);
    return Promise.all((files ?? []).map((file) => this.storage.store(file, f)));
  }
}
