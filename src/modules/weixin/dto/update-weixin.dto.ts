import { PartialType } from '@nestjs/mapped-types';
import { CreateWeixinDto } from './create-weixin.dto';

export class UpdateWeixinDto extends PartialType(CreateWeixinDto) {}
