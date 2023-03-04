import { Controller, Get, Post } from '@nestjs/common';
import { TestService } from './test.service';

@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post('/add')
  create() {
    return this.testService.create();
  }

  @Get('/findAll')
  findAll() {
    return this.testService.findAll();
  }
}
