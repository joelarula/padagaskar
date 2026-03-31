// Resolvers for core.prisma models: Topic, Text, Source, Attachment, Tag

export const coreResolvers = {
    Query: {
        topics: async (_parent: any, _args: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.topic.findMany({
                where: { userId: context.user.id },
                include: {
                    texts: {
                        include: {
                            sources: true,
                            specimens: {
                                include: {
                                    feature: {
                                        include: {
                                            category: true
                                        }
                                    },
                                    explanationText: true,
                                    metrics: true
                                }
                            }
                        }
                    }
                }
            });
        },
        topic: async (_parent: any, { id }: { id: string }, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.topic.findUnique({
                where: { id, userId: context.user.id },
                include: {
                    texts: {
                        include: {
                            sources: true,
                            specimens: {
                                include: {
                                    feature: {
                                        include: {
                                            category: true
                                        }
                                    },
                                    explanationText: true,
                                    metrics: true
                                }
                            }
                        }
                    }
                }
            });
        },
    },
    Mutation: {
        // --- TOPIC CRUD ---
        createTopic: async (_parent: any, { title, description, language }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.topic.create({
                data: {
                    title,
                    description,
                    language: language || 'et',
                    userId: context.user.id,
                },
                include: { texts: { include: { sources: true, specimens: { include: { feature: { include: { category: true } }, metrics: true } } } } }
            });
        },
        updateTopic: async (_parent: any, { id, title, description, summary, language }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            const data: any = {};
            if (title !== undefined) data.title = title;
            if (description !== undefined) data.description = description;
            if (summary !== undefined) data.summary = summary;
            if (language !== undefined) data.language = language;
            return await context.prisma.topic.update({
                where: { id, userId: context.user.id },
                data,
                include: { texts: true }
            });
        },
        deleteTopic: async (_parent: any, { id }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            await context.prisma.topic.delete({ where: { id, userId: context.user.id } });
            return true;
        },
        publishTopic: async (_parent: any, { id, publish }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.topic.update({
                where: { id, userId: context.user.id },
                data: { isPublished: publish, permalink: publish ? `topic-${id}` : null }
            });
        },

        // --- TEXT CRUD ---
        createText: async (_parent: any, { topicId, content, language }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.text.create({
                data: { content, language: language || 'et', userId: context.user.id, topics: { connect: { id: topicId } } },
                include: { sources: true }
            });
        },
        updateText: async (_parent: any, { id, content, language }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.text.update({
                where: { id, userId: context.user.id },
                data: { content, language },
                include: { sources: true }
            });
        },
        deleteText: async (_parent: any, { id }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            await context.prisma.text.delete({ where: { id, userId: context.user.id } });
            return true;
        },
        // publishText: async (_parent: any, { id, publish }: any, context: any) => {
        //     if (!context.user) throw new Error('Unauthorized');
        //     return await context.prisma.text.update({
        //         where: { id, userId: context.user.id },
        //         data: { report: { update: { isPublished: publish, permalink: publish ? `report-${id}` : null } } },
        //         include: { report: true }
        //     });
        // },

        // --- SOURCE CRUD ---
        addSource: async (_parent: any, { targetId, targetType, input }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            const data: any = { ...input };
            if (targetType === 'TEXT') data.textId = targetId;
            
            return await context.prisma.source.create({ data });
        },
        updateSource: async (_parent: any, { id, input }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.source.update({ where: { id }, data: input });
        },
        deleteSource: async (_parent: any, { id }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            await context.prisma.source.delete({ where: { id } });
            return true;
        },
    },
};
