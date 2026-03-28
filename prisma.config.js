// This bridge config tells the Prisma IDE extension where the schema is
// and that the URL is handled programmatically, resolving the 'missing url' error.
export default {
  schema: 'server/prisma/schema',
  migrations: {
    path: 'server/prisma/migrations',
  }
};
