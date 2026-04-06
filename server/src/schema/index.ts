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

  type TopicConnection {
    items: [Topic!]!
    totalCount: Int!
  }

  type Text {
    id: ID!
    content: String!
    summary: String
    language: String
    sources: [Source!]!
    specimens: [Specimen!]!
    tags: [Tag!]!
    report: Report
    aiModel: AIModel
    promptVersion: PromptVersion
    createdAt: String!
    updatedAt: String!
  }

  type TextConnection {
    items: [Text!]!
    totalCount: Int!
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

  type AIModel {
    id: ID!
    name: String!
    provider: String!
    type: String!
  }

  type PromptVersion {
    id: ID!
    version: Int!
    content: String!
    template: PromptTemplate!
  }

  type PromptTemplate {
    id: ID!
    name: String!
    description: String
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

  type TextFeature {
    id: ID!
    name: String!
    text: Text!
    tags: [Tag!]!
    createdAt: String!
    updatedAt: String!
  }

  type TextFeatureConnection {
    items: [TextFeature!]!
    totalCount: Int!
  }

  type Specimen {
    id: ID!
    feature: TextFeature!
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

  input TextFilterInput {
    search: String
    tags: [TagInput!]
    startDate: String
    endDate: String
  }

  input TopicFilterInput {
    search: String
    tags: [TagInput!]
    startDate: String
    endDate: String
  }

  input TextFeatureFilterInput {
    search: String
    tags: [TagInput!]
  }

  type Query {
    me: User
    topics(filter: TopicFilterInput, skip: Int, take: Int): TopicConnection!
    topic(id: ID!): Topic
    textFeatures(filter: TextFeatureFilterInput, skip: Int, take: Int): TextFeatureConnection!
    textFeature(id: ID!): TextFeature
    reports: [Report!]!
    report(id: ID!): Report
    texts(filter: TextFilterInput, skip: Int, take: Int): TextConnection!
    text(id: ID!): Text
    textsByTags(tags: [TagInput!]!): [Text!]!
    tags: [Tag!]!
  }

  type Mutation {
    # Topic CRUD
    createTopic(title: String!, description: String, language: String, tags: [TagInput!]): Topic!
    updateTopic(id: ID!, title: String, description: String, summary: String, language: String, tags: [TagInput!]): Topic!
    deleteTopic(id: ID!): Boolean!
    publishTopic(id: ID!, publish: Boolean!): Topic!

    # TextFeature CRUD
    createTextFeature(name: String!, textId: ID, tags: [TagInput!]): TextFeature!
    updateTextFeature(id: ID!, name: String, tags: [TagInput!]): TextFeature!
    deleteTextFeature(id: ID!): Boolean!

    # Text CRUD
    createText(content: String!, language: String, topicId: ID, sources: [SourceInput!], tags: [TagInput!]): Text!
    createTextFromUrl(url: String!, topicId: ID, tags: [TagInput!]): Text!
    updateText(id: ID!, content: String, summary: String, language: String, tags: [TagInput!]): Text!
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
