// Resolvers for analysis.prisma models: Report, AnalyzeRequest, Specimen, etc.

import { ChunkingService } from '../services/ChunkingService.js';

export const analysisResolvers = {
    Query: {
        reports: async (_parent: any, _args: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.report.findMany({
                include: {
                    text: {
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
                    },
                    request: {
                        include: {
                            topic: true
                        }
                    },
                    metrics: true
                }
            });
        },
        report: async (_parent: any, { id }: { id: string }, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.report.findUnique({
                where: { id },
                include: {
                    text: {
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
                    },
                    request: {
                        include: {
                            topic: true
                        }
                    },
                    metrics: true
                }
            });
        },
        textFeatures: async (_parent: any, { filter, skip, take }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            
            const where: any = {};
            
            if (filter) {
                const { search, tags } = filter;
                const filterConditions: any[] = [];
                
                if (search) {
                    filterConditions.push({ name: { contains: search, mode: 'insensitive' } });
                }
                
                if (tags && tags.length > 0) {
                    tags.forEach((tag: any) => {
                        filterConditions.push({
                            tags: {
                                some: {
                                    name: tag.name,
                                    value: tag.value || null
                                }
                            }
                        });
                    });
                }

                if (filterConditions.length > 0) {
                    where.AND = filterConditions;
                }
            }
            
            const [items, totalCount] = await Promise.all([
                context.prisma.textFeature.findMany({
                    where,
                    skip: skip || 0,
                    take: take || 20,
                    orderBy: { name: 'asc' },
                    include: { tags: true, text: true }
                }),
                context.prisma.textFeature.count({ where })
            ]);
            
            return { items, totalCount };
        },
        textFeature: async (_parent: any, { id }: { id: string }, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.textFeature.findUnique({
                where: { id },
                include: { tags: true, text: true }
            });
        },
    },
    Mutation: {
        createTextFeature: async (_parent: any, { name, textId, tags }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            
            // If textId is not provided, we create a placeholder text
            let finalId = textId;
            if (!finalId) {
                const newText = await context.prisma.text.create({
                    data: {
                        content: `Description for ${name}`,
                        userId: context.user.id,
                        language: 'et'
                    }
                });
                finalId = newText.id;
            }

            return await context.prisma.textFeature.create({
                data: {
                    name,
                    textId: finalId,
                    tags: tags ? {
                        connectOrCreate: tags.map((t: any) => ({
                            where: { name_value: { name: t.name, value: t.value || null } },
                            create: { name: t.name, value: t.value || null }
                        }))
                    } : undefined
                },
                include: { tags: true, text: true }
            });
        },
        updateTextFeature: async (_parent: any, { id, name, tags }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            
            const data: any = {};
            if (name !== undefined) data.name = name;
            if (tags !== undefined) {
                data.tags = {
                    set: [],
                    connectOrCreate: tags.map((t: any) => ({
                        where: { name_value: { name: t.name, value: t.value || null } },
                        create: { name: t.name, value: t.value || null }
                    }))
                };
            }

            return await context.prisma.textFeature.update({
                where: { id },
                data,
                include: { tags: true, text: true }
            });
        },
        deleteTextFeature: async (_parent: any, { id }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            await context.prisma.textFeature.delete({ where: { id } });
            return true;
        },
        analyzeTopic: async (_parent: any, { topicId }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.analyzeRequest.create({
                data: { topicId, status: 'PENDING', promptSettings: {} },
                include: { topic: true }
            });
        },
        chunkText: async (_parent: any, { textId, chunkSize, overlap }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            const chunkingService = new ChunkingService(context.prisma);
            return await chunkingService.chunkText(textId, chunkSize || 1000, overlap || 200);
        },
    },
};
