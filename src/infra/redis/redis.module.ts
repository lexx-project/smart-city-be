import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import Redis from 'ioredis';

export const REDIS_SERVICE = 'REDIS_SERVICE';
export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: REDIS_SERVICE,
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.REDIS,
                    options: {
                        host: configService.get<string>('REDIS_HOST', 'localhost'),
                        port: configService.get<number>('REDIS_PORT', 6379),
                        retryAttempts: 10,
                        retryDelay: 3000,
                    },
                }),
                inject: [ConfigService],
            },
        ]),
    ],
    providers: [
        {
            provide: REDIS_CLIENT,
            useFactory: (configService: ConfigService) => {
                const logger = new Logger('RedisClient');
                const redis = new Redis({
                    host: configService.get<string>('REDIS_HOST', 'localhost'),
                    port: configService.get<number>('REDIS_PORT', 6379),
                    retryStrategy: (times) => {
                        return Math.min(times * 100, 3000);
                    },
                });

                redis.on('error', (err) => {
                    logger.error('Redis connection error:', err.message);
                });

                return redis;
            },
            inject: [ConfigService],
        },
    ],
    exports: [ClientsModule, REDIS_CLIENT],
})
export class RedisModule { }
