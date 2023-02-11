import { TransformInterceptor } from './intercepts/transform.interceptor';
import { Module, UseInterceptors } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { MenuModule } from './modules/menu/menu.module';
import { AuthModule } from './modules/auth/auth.module';
import { UploadModule } from './modules/upload/upload.module';

@UseInterceptors(TransformInterceptor)
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.development.env'] }),
    TypeOrmModule.forRoot({
      host: process.env.DATABASE_HOST,
      type: 'mysql',
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      port: parseInt(process.env.DATABASE_PORT, 10),
      database: process.env.DATABASE_NAME,
      synchronize: true,
      autoLoadEntities: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../../', 'docs'),
      exclude: ['/api*'],
    }),
    UserModule,
    RoleModule,
    MenuModule,
    AuthModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
