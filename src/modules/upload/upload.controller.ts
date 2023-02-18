import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { writeFile } from 'fs';

@Controller('upload')
export class UploadController {
  @Post('/img')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    const fileName = Date.now();
    const type = file.originalname.split('.')[1];
    writeFile(`./docs/imgs/${fileName}.${type}`, file.buffer, (err) => {
      if (err) {
        console.log(err);
        return err;
      }
    });
    return `${fileName}.${type}`;
  }
}
