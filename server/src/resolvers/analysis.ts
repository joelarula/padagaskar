// Resolvers for analysis.prisma models: Report, AIModel, PromptVersion
import { ChunkingService } from '../services/ChunkingService.js';

export const analysisResolvers = {
    Query: {
        reports: async (_parent: any, { status }: { status?: string }, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            const where = status ? { status } : {};
            return await context.prisma.report.findMany({
                where,
                include: {
                    source: true,
                    texts: true,
                    aiModel: true,
                    promptVersion: { include: { template: true } },
                    metrics: true
                },
                orderBy: { createdAt: 'desc' }
            });
        },
        report: async (_parent: any, { id }: { id: string }, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.report.findUnique({
                where: { id },
                include: {
                    source: true,
                    texts: true,
                    aiModel: true,
                    promptVersion: { include: { template: true } },
                    metrics: true
                }
            });
        }
    },
    Mutation: {
        analyzePage: async (_parent: any, { sourceId, textId }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            
            // If textId is not provided, use the latest one from the source
            let targetTextId = textId;
            if (!targetTextId) {
                const latestText = await context.prisma.text.findFirst({
                    where: { originSourceId: sourceId },
                    orderBy: { createdAt: 'desc' }
                });
                if (!latestText) throw new Error('Source has no content to analyze');
                targetTextId = latestText.id;
            }

            // Create a pending report
            // Note: In a real app, this would trigger an async background job
            return await context.prisma.report.create({
                data: {
                    status: 'PENDING',
                    sourceId,
                    texts: { connect: { id: targetTextId } },
                    aiModelId: 'default-model', // Placeholder
                    isAiGenerated: true
                },
                include: {
                    source: true,
                    texts: true
                }
            });
        }
    },

    Report: {
        resultJson: (report: any) => report.resultJson ? JSON.stringify(report.resultJson) : null
    }
};
