import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jsonwebtoken';
import type { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { setupGoogleStrategy } from './google.js';

const JWT_SECRET = process.env.JWT_SECRET || 'padagaskar-secret-key-change-me';

export function setupAuth(app: Express, prisma: PrismaClient) {
    // Setup Google Strategy
    setupGoogleStrategy(prisma);

    // Setup JWT Strategy
    passport.use(new JwtStrategy({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: JWT_SECRET
    },
        async (payload, done) => {
            try {
                const user = await prisma.user.findUnique({
                    where: { id: payload.sub }
                });
                if (user) {
                    return done(null, user);
                }
                return done(null, false);
            } catch (error) {
                return done(error, false);
            }
        }
    ));

    app.use(passport.initialize());

    // Auth routes
    app.get('/auth/google',
        passport.authenticate('google', { scope: ['profile', 'email'], session: false })
    );

    app.get('/auth/google/callback',
        passport.authenticate('google', { session: false, failureRedirect: '/login' }),
        (req: any, res: any) => {
            const user = req.user as any;
            const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

            // Redirect to frontend with token
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(`${frontendUrl}/?token=${token}`);
        }
    );

    app.get('/auth/logout', (req: any, res: any) => {
        res.json({ success: true });
    });
}

export async function getUserFromToken(token: string, prisma: PrismaClient) {
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return await prisma.user.findUnique({
            where: { id: decoded.sub }
        });
    } catch (error) {
        console.error('JWT verification failed:', error);
        return null;
    }
}
