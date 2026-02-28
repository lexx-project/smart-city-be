import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
      retryAttempts: 10,
      retryDelay: 3000,
    },
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors({
    credentials: true,
    origin: '*',
  });

  // ─── Swagger / OpenAPI ───────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Smart Public Service API')
    .setDescription(
      `REST API untuk sistem layanan publik cerdas (Smart Public Service).

## Autentikasi
Semua endpoint kecuali **POST /auth/staff/login** memerlukan header:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`
Token diperoleh melalui endpoint login.

## Modul yang tersedia
- **Auth** – Login staff & profil sesi aktif
- **Users** – Manajemen data warga
- **Staff** – Manajemen petugas & role
- **Agencies** – Manajemen dinas / instansi
- **Categories** – Pohon kategori layanan
- **Tickets** – Tiket pengaduan warga
- **SLA** – Aturan & monitoring Service Level Agreement
- **Analytics** – Dashboard & statistik
- **Conversation** – Webhook integrasi percakapan (WhatsApp, dll)
    `,
    )
    .setVersion('1.0')
    .setContact(
      'Smart Public Service Team',
      'https://github.com/smart-public-service',
      'support@smartpublicservice.id',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Masukkan JWT token yang diperoleh dari endpoint /auth/staff/login',
        in: 'header',
      },
      'jwt-auth',
    )
    .addTag('Auth', 'Autentikasi & sesi staff')
    .addTag('Users', 'Manajemen data warga')
    .addTag('Staff', 'Manajemen petugas layanan')
    .addTag('Agencies', 'Manajemen dinas / instansi pemerintah')
    .addTag('Categories', 'Pohon kategori layanan publik')
    .addTag('Tickets', 'Tiket pengaduan & permohonan warga')
    .addTag('SLA', 'Aturan & monitoring Service Level Agreement')
    .addTag('Analytics', 'Dashboard statistik & laporan')
    .addTag('Conversation', 'Webhook integrasi percakapan eksternal')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Smart Public Service – API Docs',
  });
  // ─────────────────────────────────────────────────────────────────────────────

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

