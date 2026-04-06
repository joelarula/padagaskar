// Resolvers for core.prisma models: Topic, Text, Source, Attachment, Tag
import { ScraperService } from '../services/ScraperService.js';
import { AIService } from '../services/AIService.js';

export const coreResolvers = {
    Query: {
        topics: async (_parent: any, { filter, skip, take }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            
            const where: any = { userId: context.user.id };
            
            if (filter) {
                const { search, tags, startDate, endDate } = filter;
                const filterConditions: any[] = [];
                
                if (search) {
                    filterConditions.push({
                        OR: [
                            { title: { contains: search, mode: 'insensitive' } },
                            { description: { contains: search, mode: 'insensitive' } },
                            { summary: { contains: search, mode: 'insensitive' } }
                        ]
                    });
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
                
                if (startDate || endDate) {
                    const dateFilter: any = {};
                    if (startDate) dateFilter.gte = new Date(startDate);
                    if (endDate) dateFilter.lte = new Date(endDate);
                    filterConditions.push({ createdAt: dateFilter });
                }

                if (filterConditions.length > 0) {
                    where.AND = filterConditions;
                }
            }
            
            const [items, totalCount] = await Promise.all([
                context.prisma.topic.findMany({
                    where,
                    skip: skip || 0,
                    take: take || 20,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        tags: true,
                        texts: {
                            take: 5, // Just a preview
                            include: { sources: true, tags: true }
                        }
                    }
                }),
                context.prisma.topic.count({ where })
            ]);
            
            return { items, totalCount };
        },
        topic: async (_parent: any, { id }: { id: string }, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.topic.findUnique({
                where: { id, userId: context.user.id },
                include: {
                    texts: {
                        include: {
                            sources: true,
                            tags: true,
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
        texts: async (_parent: any, { filter, skip, take }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            
            const where: any = { userId: context.user.id };
            
            if (filter) {
                const { search, tags, startDate, endDate } = filter;
                const filterConditions: any[] = [];
                
                if (search) {
                    filterConditions.push({
                        OR: [
                            { content: { contains: search, mode: 'insensitive' } },
                            { summary: { contains: search, mode: 'insensitive' } }
                        ]
                    });
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
                
                if (startDate || endDate) {
                    const dateFilter: any = {};
                    if (startDate) dateFilter.gte = new Date(startDate);
                    if (endDate) dateFilter.lte = new Date(endDate);
                    filterConditions.push({ createdAt: dateFilter });
                }

                if (filterConditions.length > 0) {
                    where.AND = filterConditions;
                }
            }
            
            const [items, totalCount] = await Promise.all([
                context.prisma.text.findMany({
                    where,
                    skip: skip || 0,
                    take: take || 20,
                    orderBy: { createdAt: 'desc' },
                    include: { 
                        sources: true, 
                        tags: true,
                        aiModel: true,
                        promptVersion: {
                            include: { template: true }
                        }
                    }
                }),
                context.prisma.text.count({ where })
            ]);
            
            return { items, totalCount };
        },
        text: async (_parent: any, { id }: { id: string }, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.text.findUnique({
                where: { id, userId: context.user.id },
                include: { 
                    sources: true, 
                    tags: true,
                    aiModel: true,
                    promptVersion: true
                }
            });
        },
        textsByTags: async (_parent: any, { tags }: { tags: any[] }, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.text.findMany({
                where: {
                    userId: context.user.id,
                    AND: tags.map(tag => ({
                        tags: {
                            some: {
                                name: tag.name,
                                value: tag.value
                            }
                        }
                    }))
                },
                include: { sources: true, tags: true }
            });
        },
        tags: async (_parent: any, _args: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.tag.findMany({
                where: {
                    OR: [
                        { texts: { some: { userId: context.user.id } } },
                        { topics: { some: { userId: context.user.id } } }
                    ]
                }
            });
        },
    },
    Mutation: {
        // --- TOPIC CRUD ---
        createTopic: async (_parent: any, { title, description, language, tags }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            
            const createData: any = {
                title,
                description,
                language: language || 'et',
                userId: context.user.id,
            };

            if (tags && tags.length > 0) {
                createData.tags = {
                    connectOrCreate: tags.map((t: any) => ({
                        where: { name_value: { name: t.name, value: t.value || null } },
                        create: { name: t.name, value: t.value || null }
                    }))
                };
            }

            return await context.prisma.topic.create({
                data: createData,
                include: { tags: true }
            });
        },
        updateTopic: async (_parent: any, { id, title, description, summary, language, tags }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            const data: any = {};
            if (title !== undefined) data.title = title;
            if (description !== undefined) data.description = description;
            if (summary !== undefined) data.summary = summary;
            if (language !== undefined) data.language = language;

            if (tags !== undefined) {
                data.tags = {
                    set: [], // Clear existing tags
                    connectOrCreate: tags.map((t: any) => ({
                        where: { name_value: { name: t.name, value: t.value || null } },
                        create: { name: t.name, value: t.value || null }
                    }))
                };
            }

            return await context.prisma.topic.update({
                where: { id, userId: context.user.id },
                data,
                include: { tags: true }
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
        createText: async (_parent: any, { content, language, topicId, sources, tags }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            
            const data: any = {
                content,
                language: language || 'et',
                userId: context.user.id,
            };

            if (topicId) {
                data.topics = { connect: { id: topicId } };
            }

            if (sources && sources.length > 0) {
                data.sources = {
                    create: sources.map((s: any) => ({
                        ...s,
                    }))
                };
            }

            if (tags && tags.length > 0) {
                data.tags = {
                    connectOrCreate: tags.map((t: any) => ({
                        where: { name_value: { name: t.name, value: t.value || null } },
                        create: { name: t.name, value: t.value || null }
                    }))
                };
            }

            return await context.prisma.text.create({
                data,
                include: { sources: true, tags: true }
            });
        },
        createTextFromUrl: async (_parent: any, { url, topicId, tags }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');

            // 1. Extract content from URL
            const { title, content } = await ScraperService.extractFromUrl(url);

            // 2. Generate summary via AI and extract metadata
            const metadata = await AIService.syncPromptVersion(context.prisma);
            const { summary, author } = await AIService.analyzeContent(content, { title, url });

            const data: any = {
                content,
                summary,
                aiModelId: metadata.aiModelId,
                promptVersionId: metadata.promptVersionId,
                language: 'et', // Default to et, or we could try to detect it
                userId: context.user.id,
                sources: {
                    create: [{
                        url,
                        title,
                        type: 'WEB',
                    }]
                }
            };

            if (topicId) {
                data.topics = { connect: { id: topicId } };
            }

            // Prepare tags
            const finalTags = tags || [];
            if (author) {
                finalTags.push({ name: 'author', value: author });
            }

            if (finalTags.length > 0) {
                data.tags = {
                    connectOrCreate: finalTags.map((t: any) => ({
                        where: { name_value: { name: t.name, value: t.value || null } },
                        create: { name: t.name, value: t.value || null }
                    }))
                };
            }

            return await context.prisma.text.create({
                data,
                include: { sources: true, tags: true }
            });
        },
        updateText: async (_parent: any, { id, content, summary, language, tags }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            
            const data: any = {};
            if (content !== undefined) data.content = content;
            if (summary !== undefined) data.summary = summary;
            if (language !== undefined) data.language = language;
            
            if (tags !== undefined) {
                // Ensure all tags exist and get their IDs
                const tagIds = await Promise.all(tags.map(async (t: any) => {
                    const tag = await context.prisma.tag.upsert({
                        where: { name_value: { name: t.name, value: t.value || null } },
                        create: { name: t.name, value: t.value || null },
                        update: {}
                    });
                    return { id: tag.id };
                }));
                data.tags = { set: tagIds };
            }

            return await context.prisma.text.update({
                where: { id, userId: context.user.id },
                data,
                include: { sources: true, tags: true }
            });
        },
        deleteText: async (_parent: any, { id }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            await context.prisma.text.delete({ where: { id, userId: context.user.id } });
            return true;
        },

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

        // --- TEXT-TOPIC LINKING ---
        addTextToTopic: async (_parent: any, { textId, topicId }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.topic.update({
                where: { id: topicId, userId: context.user.id },
                data: { texts: { connect: { id: textId } } },
                include: { texts: true }
            });
        },
        removeTextFromTopic: async (_parent: any, { textId, topicId }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            return await context.prisma.topic.update({
                where: { id: topicId, userId: context.user.id },
                data: { texts: { disconnect: { id: textId } } },
                include: { texts: true }
            });
        },

        // --- TAG CRUD ---
        addTag: async (_parent: any, { targetId, targetType, input }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            
            const tag = await context.prisma.tag.upsert({
                where: { name_value: { name: input.name, value: input.value || null } },
                create: { name: input.name, value: input.value || null },
                update: {}
            });

            if (targetType === 'TEXT') {
                await context.prisma.text.update({
                    where: { id: targetId, userId: context.user.id },
                    data: { tags: { connect: { id: tag.id } } }
                });
            } else if (targetType === 'TOPIC') {
                await context.prisma.topic.update({
                    where: { id: targetId, userId: context.user.id },
                    data: { tags: { connect: { id: tag.id } } }
                });
            }
            
            return tag;
        },
        removeTag: async (_parent: any, { tagId, targetId, targetType }: any, context: any) => {
            if (!context.user) throw new Error('Unauthorized');
            
            if (targetType === 'TEXT') {
                await context.prisma.text.update({
                    where: { id: targetId, userId: context.user.id },
                    data: { tags: { disconnect: { id: tagId } } }
                });
            } else if (targetType === 'TOPIC') {
                await context.prisma.topic.update({
                    where: { id: targetId, userId: context.user.id },
                    data: { tags: { disconnect: { id: tagId } } }
                });
            }
            
            return true;
        },
    },
};
