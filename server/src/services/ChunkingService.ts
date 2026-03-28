import { PrismaClient } from '@prisma/client';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";

export class ChunkingService {
    private prisma: PrismaClient;
    private modelName = 'Xenova/bge-base-en-v1.5';

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    /**
     * Splits text into chunks with a given size and overlap using LangChain.
     * Generates embeddings using BGE-Base-EN-v1.5 (Xenova).
     */
    async chunkText(textId: string, chunkSize: number = 1000, chunkOverlap: number = 200) {
        // 1. Fetch the text content
        const text = await this.prisma.text.findUnique({
            where: { id: textId }
        });

        if (!text) {
            throw new Error(`Text with ID ${textId} not found`);
        }

        // 2. Clear existing chunks for this text
        await this.prisma.chunk.deleteMany({
            where: { textId }
        });

        // 3. Ensure the AI model record exists
        let aiModel = await this.prisma.aIModel.findUnique({
            where: { name: this.modelName }
        });

        if (!aiModel) {
            aiModel = await this.prisma.aIModel.create({
                data: {
                    name: this.modelName,
                    provider: 'HuggingFace',
                    type: 'EMBEDDING',
                    version: '1.5'
                }
            });
        }

        // 4. Initialize LangChain Splitter and Embeddings
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize,
            chunkOverlap,
        });

        const embeddings = new HuggingFaceTransformersEmbeddings({
            model: this.modelName,
        });

        const textChunks = await splitter.splitText(text.content);
        console.log(`✅ Splitting text into ${textChunks.length} chunks...`);

        // 5. Generate embeddings and save chunks
        const results = [];
        
        // Map model names to database columns
        const columnMap: Record<string, string> = {
            'Xenova/bge-base-en-v1.5': 'bge_base_en_v1_5',
            'Xenova/all-MiniLM-L6-v2': 'all_minilm_l6_v2',
            'text-embedding-3-small': 'text_embedding_3_small'
        };

        const targetColumn = columnMap[this.modelName];
        if (!targetColumn) throw new Error(`Model ${this.modelName} does not have a mapped column in the Chunk table`);

        for (const [index, content] of textChunks.entries()) {
            const vectorData = await embeddings.embedQuery(content);
            console.log(`✅ Embedding chunk ${index + 1}/${textChunks.length}`);

            // We use raw SQL to insert the vector into the specific model column
            await this.prisma.$executeRawUnsafe(
                `INSERT INTO "Chunk" ("id", "textId", "content", "aiModelId", "${targetColumn}", "existent", "createdAt")
                 VALUES ($1, $2, $3, $4, $5::vector, NOW(), NOW())`,
                `chunk-${textId}-${index}`,
                textId,
                content,
                aiModel.id,
                `[${vectorData.join(',')}]`
            );
        }

        return await this.prisma.chunk.findMany({
            where: { textId }
        });
    }
}
