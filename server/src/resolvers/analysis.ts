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
    },
    Mutation: {
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
