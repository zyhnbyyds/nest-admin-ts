import { TransformInterceptor } from './intercepts/transform.interceptor';
import { Module, UseInterceptors } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { handleEnvFilePath, handleValidationSchema } from './utils/envConfig';
import loadEnv from '../config/configuration';

@UseInterceptors(TransformInterceptor)
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: false,
      envFilePath: handleEnvFilePath(),
      load: [loadEnv],
      validationSchema: handleValidationSchema(),
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        return {
          host: config.get<string>('database.host'),
          type: 'mysql',
          username: config.get<string>('database.user'),
          password: config.get<string>('database.password'),
          port: config.get<number>('database.port'),
          database: config.get<string>('database.name'),
          synchronize: true,
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService],
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
