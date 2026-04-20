import { FeedService } from '../services/FeedService.js';
import { ScraperService } from '../services/ScraperService.js';
import { AIService } from '../services/AIService.js';
import { ChunkingService } from '../services/ChunkingService.js';

export const feedsResolver = {
    Query: {
        feeds: async (_parent: any, _args: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.feed.findMany({
                where: { userId: context.user.id, existent: true },
                include: { sources: true }
            });
        },
        sourcesReview: async (_parent: any, { status, skip, take }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            
            const where: any = {
                existent: true,
                status: status || 'NEW',
                // We show sources from feeds owned by the user
                feed: { userId: context.user.id }
            };

            const [items, totalCount] = await Promise.all([
                context.prisma.source.findMany({
                    where,
                    skip: skip || 0,
                    take: take || 50,
                    orderBy: { createdAt: 'desc' },
                    include: { feed: true }
                }),
                context.prisma.source.count({ where })
            ]);

            return { items, totalCount };
        }
    },
    Mutation: {
        createFeed: async (_parent: any, { url, name, pollingPeriod }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.feed.create({
                data: {
                    url,
                    name,
                    pollingPeriod: pollingPeriod || 60,
                    userId: context.user.id
                }
            });
        },
        updateFeed: async (_parent: any, { id, ...data }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.feed.update({
                where: { id, userId: context.user.id },
                data
            });
        },
        deleteFeed: async (_parent: any, { id }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            await context.prisma.feed.update({
                where: { id, userId: context.user.id },
                data: { existent: false }
            });
            return true;
        },
        pollFeed: async (_parent: any, { id }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await FeedService.pollFeed(context.prisma, id);
        },
        pollAllFeeds: async (_parent: any, _args: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await FeedService.pollAllFeeds(context.prisma);
        },
        batchDeleteSources: async (_parent: any, { ids }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            const result = await context.prisma.source.deleteMany({
                where: { id: { in: ids }, feed: { userId: context.user.id } }
            });
            return result.count;
        },
        batchDiscardSources: async (_parent: any, { ids }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            const result = await context.prisma.source.updateMany({
                where: { id: { in: ids }, feed: { userId: context.user.id } },
                data: { status: 'DISCARDED' }
            });
            return result.count;
        },
        initializeTextFromSource: async (_parent: any, { id, topicId }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            
            const source = await context.prisma.source.findUnique({
                where: { id },
                include: { feed: true }
            });

            if (!source || !source.url) throw new Error('Source not found or has no URL.');

            // 1. Scrape full content
            const scraped = await ScraperService.extractFromUrl(source.url);
            
            // 2. Generate AI Summary & metadata
            const metadata = await AIService.syncPromptVersion(context.prisma);
            const { summary, author } = await AIService.analyzeContent(scraped.content, { 
                title: source.title || scraped.title, 
                url: source.url 
            });

            // 3. Create Text entity
            const text = await context.prisma.text.create({
                data: {
                    content: scraped.content,
                    summary: {
                        create: {
                            content: summary,
                            aiModelId: metadata.aiModelId,
                            promptVersionId: metadata.promptVersionId
                        }
                    },
                    userId: context.user.id,
                    sources: { connect: { id } },
                    topics: topicId ? { connect: { id: topicId } } : undefined,
                    tags: author ? {
                        connectOrCreate: {
                            where: { name_value: { name: 'author', value: author } },
                            create: { name: 'author', value: author }
                        }
                    } : undefined
                }
            });

            // 4. Update Source status
            await context.prisma.source.update({
                where: { id },
                data: { status: 'PROCESSED', textId: text.id }
            });

            // 5. Trigger AI Chunking & Multilingual Embeddings (LangChain + text-embedding-004)
            try {
                await ChunkingService.createChunksFromText(context.prisma, text.id, context.user.id);
            } catch (err) {
                console.error("AI Chunking failed, but text was created:", err);
            }

            return text;
        }
    }
};
