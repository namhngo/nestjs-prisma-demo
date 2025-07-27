import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { UsersModule } from './modules/users/users.module';
import { CoreModule } from './core/core.module';

@Module({
  imports: [ CoreModule], // add UsersModule later
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
