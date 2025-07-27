import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { CoreModule } from './core/core.module';

@Module({
  imports: [ UsersModule, CoreModule], 
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
