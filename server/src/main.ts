import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = process.env.PORT || 3829;

  app.enableCors();

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('reefly')
    .setDescription('reefly Server APIs')
    .setVersion('1.0.0')
    .addServer(`http://localhost:${PORT}`, 'Local environment')
    .addServer(`https://api.xfibot.xyz/reefly/`, 'Production Server')

    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api/docs', app, document);
  await app.listen(PORT);
}
bootstrap();
