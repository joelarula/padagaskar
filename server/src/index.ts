import express from 'express';
import { ApolloServer } from '@apollo/server';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { typeDefs } from './schema/index.js';
import { resolvers } from './resolvers/index.js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import { setupAuth, getUserFromToken } from './auth/index.js';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = process.env.PORT || 4000;

async function startServer() {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
    });

    await server.start();

    // Middlewares
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    app.use(cookieParser());

    // Setup Auth
    setupAuth(app as any, prisma);

    // GraphQL middleware with manual execution (Curator pattern)
    app.post('/graphql', bodyParser.json(), async (req, res) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const user = await getUserFromToken(token || '', prisma);
        const contextValue = { user, prisma };

        try {
            const response = await server.executeOperation({
                query: req.body.query,
                variables: req.body.variables,
                operationName: req.body.operationName
            }, { contextValue });

            if (response.body.kind === 'single') {
                res.json(response.body.singleResult);
            } else {
                res.json(response.body);
            }
        } catch (error) {
            console.error('GraphQL execution error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.listen(PORT, () => {
        console.log(`🚀 Server ready at http://localhost:${PORT}`);
        console.log(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
    });
}

startServer().catch((error) => {
    console.error('Error starting server:', error);
});
