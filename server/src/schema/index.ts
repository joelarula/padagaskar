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
    description: String
    summary: String
    language: String
    isPublished: Boolean!
    permalink: String
    texts: [Text!]!
    tags: [Tag!]!
    createdAt: String!
    updatedAt: String!
  }

  type Text {
    id: ID!
    content: String!
    language: String
    sources: [Source!]!
    specimens: [Specimen!]!
    tags: [Tag!]!
    report: Report
    createdAt: String!
    updatedAt: String!
  }

  type Source {
    id: ID!
    url: String
    title: String
    description: String
    type: String!
  }

  type AnalyzeRequest {
    id: ID!
    topic: Topic!
    status: String!
    report: Report
    createdAt: String!
  }

  type Report {
    id: ID!
    request: AnalyzeRequest!
    text: Text!
    isAiGenerated: Boolean!
    metrics: [AnalysisMetric!]!
    createdAt: String!
  }

  type AnalysisMetric {
    id: ID!
    name: String!
    value: Float!
    justification: String!
  }

  type Category {
    id: ID!
    name: String!
    description: String
    parent: Category
    children: [Category!]!
  }

  type Specimen {
    id: ID!
    category: Category!
    text: Text!
    startOffset: Int
    endOffset: Int
    explanationText: Text
    metrics: [AnalysisMetric!]!
    metadata: String
  }

  type Chunk {
    id: ID!
    content: String!
    selectionStart: Int
    selectionEnd: Int
    createdAt: String!
  }

  type Tag {
    id: ID!
    name: String!
    value: String
  }

  input SourceInput {
    url: String
    title: String
    description: String
    type: String!
  }

  input TagInput {
    name: String!
    value: String
  }

  type Query {
    me: User
    topics: [Topic!]!
    topic(id: ID!): Topic
    reports: [Report!]!
    report(id: ID!): Report
  }

  type Mutation {
    # Topic CRUD
    createTopic(title: String!, description: String, language: String): Topic!
    updateTopic(id: ID!, title: String, description: String, summary: String, language: String): Topic!
    deleteTopic(id: ID!): Boolean!
    publishTopic(id: ID!, publish: Boolean!): Topic!

    # Text CRUD
    createText(content: String!, language: String, sources: [SourceInput!]): Text!
    updateText(id: ID!, content: String, language: String): Text!
    deleteText(id: ID!): Boolean!

    # Text-Topic linking
    addTextToTopic(textId: ID!, topicId: ID!): Topic!
    removeTextFromTopic(textId: ID!, topicId: ID!): Topic!

    # Source CRUD
    addSource(targetId: ID!, targetType: String!, input: SourceInput!): Source!
    updateSource(id: ID!, input: SourceInput!): Source!
    deleteSource(id: ID!): Boolean!

    # Tag CRUD
    addTag(targetId: ID!, targetType: String!, input: TagInput!): Tag!
    removeTag(tagId: ID!, targetId: ID!, targetType: String!): Boolean!

    # Analysis & Chunking
    analyzeTopic(topicId: ID!): AnalyzeRequest!
    chunkText(textId: ID!, chunkSize: Int, overlap: Int): [Chunk!]!
  }
`;
