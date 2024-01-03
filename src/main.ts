import { AppModule } from './app.module';
import { CommandFactory } from 'nest-commander';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  await CommandFactory.run(AppModule, {
    logger: isProd
      ? ['warn', 'error']
      : ['log', 'warn', 'error', 'debug', 'verbose'],
  });
}

bootstrap();
