import { PrismaClient } from '@prisma/client'
import { SeedService } from '../src/demo/seed.service'

async function main() {
  const prisma = new PrismaClient()
  const config = { get: () => undefined } as never
  const seed = new SeedService(prisma as never, config)
  await seed.resetDatabase()
  console.log('Seed complete')
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  process.exit(1)
})
