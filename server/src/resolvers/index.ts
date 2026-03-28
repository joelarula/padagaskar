import { authResolvers } from './auth.js';
import { coreResolvers } from './core.js';
import { analysisResolvers } from './analysis.js';

// Merge all resolver modules into a single resolver map
export const resolvers = {
    Query: {
        ...authResolvers.Query,
        ...coreResolvers.Query,
        ...analysisResolvers.Query,
    },
    Mutation: {
        ...authResolvers.Mutation,
        ...coreResolvers.Mutation,
        ...analysisResolvers.Mutation,
    },
};
