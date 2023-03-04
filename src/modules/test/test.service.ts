import { Test } from './entities/test.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';

@Injectable()
export class TestService {
  constructor(
    @InjectRepository(Test)
    private readonly test: TreeRepository<Test>,
  ) {}
  async create() {
    let i = 0;
    while (i < 100000) {
      i++;
      await this.test
        .createQueryBuilder()
        .insert()
        .values({
          name: Math.random() + 'yujie',
          age: Math.random() * 100,
        })
        .execute();
    }
    return '添加成功';
  }

  findAll() {
    return this.test.findAndCount();
  }
}
