import { TransformInterceptor } from './intercepts/transform.interceptor';
import { Module, UseInterceptors } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { MenuModule } from './modules/menu/menu.module';
import { AuthModule } from './modules/auth/auth.module';

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
    UserModule,
    RoleModule,
    MenuModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
