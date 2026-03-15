import { PrismaClient } from '@prisma/client';

export const resolvers = {
    Query: {
        me: (_parent: any, _args: any, context: any) => {
            return context.user;
        },
        topics: async (_parent: any, _args: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.topic.findMany({
                where: { userId: context.user.id }
            });
        },
        topic: async (_parent: any, { id }: { id: string }, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.topic.findUnique({
                where: { id, userId: context.user.id }
            });
        }
    },
    Mutation: {
        createTopic: async (_parent: any, { title, content, language }: { title: string, content: string, language?: string }, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            
            // Create the primary text first
            const primaryText = await context.prisma.text.create({
                data: {
                    content,
                    userId: context.user.id,
                    language: language || 'et'
                }
            });

            // Create the topic
            const topic = await context.prisma.topic.create({
                data: {
                    title,
                    userId: context.user.id,
                    primaryTextId: primaryText.id,
                    language: language || 'et'
                }
            });

            return topic;
        }
    }
};
