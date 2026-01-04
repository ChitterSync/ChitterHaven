export default {
  prismaSchemaPath: 'prisma/schema.prisma',
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? 'file:./dev.db',
    },
  },
};
