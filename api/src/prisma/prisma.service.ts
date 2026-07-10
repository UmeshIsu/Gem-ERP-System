import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** Atomically increment and return the next value of a named counter (stone codes, batch codes…). */
  async nextCounter(key: string): Promise<number> {
    const row = await this.counter.upsert({
      where: { key },
      update: { value: { increment: 1 } },
      create: { key, value: 1 },
    });
    return row.value;
  }
}
