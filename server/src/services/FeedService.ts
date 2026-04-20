import Parser from 'rss-parser';
import { PrismaClient } from '@prisma/client';

export class FeedService {
    private static parser = new Parser();

    /**
     * Polls a specific feed and creates new Source entries for each item.
     */
    static async pollFeed(prisma: PrismaClient, feedId: string) {
        const feed = await prisma.feed.findUnique({
            where: { id: feedId }
        });

        if (!feed) throw new Error(`Feed with ID ${feedId} not found.`);

        const parsedFeed = await this.parser.parseURL(feed.url);
        let newItemsCount = 0;

        for (const item of parsedFeed.items) {
            if (!item.link) continue;

            // Check if source already exists by URL
            const existing = await prisma.source.findUnique({
                where: { url: item.link }
            } as any);

            if (!existing) {
                await prisma.source.create({
                    data: {
                        url: item.link,
                        title: item.title || 'Untitled',
                        description: item.contentSnippet || item.content || '',
                        type: 'WEB',
                        status: 'NEW',
                        feedId: feed.id,
                        isPublished: false
                    }
                });
                newItemsCount++;
            }
        }

        // Update last polled time
        await prisma.feed.update({
            where: { id: feedId },
            data: { lastPolledAt: new Date() }
        });

        return newItemsCount;
    }

    /**
     * Polls all active feeds.
     */
    static async pollAllFeeds(prisma: PrismaClient) {
        const feeds = await prisma.feed.findMany({
            where: { existent: true }
        });

        const results = [];
        for (const feed of feeds) {
            try {
                const count = await this.pollFeed(prisma, feed.id);
                results.push({ feedId: feed.id, name: feed.name, newItems: count });
            } catch (error: any) {
                console.error(`Error polling feed ${feed.name}:`, error.message);
                results.push({ feedId: feed.id, name: feed.name, error: error.message });
            }
        }
        return results;
    }
}
