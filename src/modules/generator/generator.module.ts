import { Module } from '@nestjs/common';
import { GeneratorController } from './generator.controller';
import { GeneratorService } from './generator.service';
@Module({ controllers: [GeneratorController], providers: [GeneratorService] })
export class GeneratorModule {}
