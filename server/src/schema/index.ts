import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String
    googleId: String
    createdAt: String!
    updatedAt: String!
  }

  type Topic {
    id: ID!
    title: String!
    language: String
    createdAt: String!
    updatedAt: String!
  }

  type Text {
    id: ID!
    content: String!
    language: String
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    me: User
    topics: [Topic!]!
    topic(id: ID!): Topic
  }

  type Mutation {
    createTopic(title: String!, content: String!, language: String): Topic!
  }
`;
