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

  """
  CORE IDENTITY: Represents a stable node in the knowledge graph.
  """
  type Source {
    id: ID!
    url: String
    path: String
    materializedPath: String
    depth: Int
    title: String
    description: String
    type: String! # WEB, BOOK, WIKI_PAGE, etc.
    status: String
    isPublished: Boolean
    publishedAt: String
    
    # Hierarchy
    parentId: ID
    parent: Source
    children: [Source!]!
    
    # Content & Semantic Links
    texts(skip: Int, take: Int): [Text!]!
    outboundRelations: [Relation!]!
    inboundRelations: [Relation!]!
    
    # Metadata
    tags: [Tag!]!
    attachments: [Attachment!]!
    metadata: String
    
    # Hierarchy
    ancestors: [Source!]!
    descendants: [Source!]!
    _count: SourceCount
    
    createdAt: String!
    updatedAt: String!
  }

  type SourceCount {
    children: Int
    texts: Int
  }

  type SourceConnection {
    items: [Source!]!
    totalCount: Int!
  }

  """
  CONTENT LAYER: Represents a specific content version for a Source.
  """
  type Text {
    id: ID!
    content: String!
    language: String
    isPublished: Boolean
    
    # Identity
    originSource: Source!
    user: User!
    
    # Analysis & Graph
    reports: [Report!]!
    tags: [Tag!]!
    metrics: [AnalysisMetric!]!
    
    createdAt: String!
    updatedAt: String!
  }

  type TextConnection {
    items: [Text!]!
    totalCount: Int!
  }

  """
  SEMANTIC EDGE: Represents a role-based link between two sources.
  """
  type Relation {
    id: ID!
    role: String! # SUMMARY, CITATION, LINK, ORIGIN
    fromSource: Source!
    toSource: Source!
    metadata: String
    createdAt: String!
  }

  """
  ANALYSIS: Merged model for analytical attempts and results.
  """
  type Report {
    id: ID!
    status: String! # PENDING, PROCESSING, COMPLETED, FAILED
    
    source: Source!
    texts: [Text!]!
    
    aiModel: AIModel!
    promptVersion: PromptVersion
    
    resultJson: String
    metrics: [AnalysisMetric!]!
    
    isAiGenerated: Boolean!
    transparencyLabel: String
    isPublished: Boolean!
    
    createdAt: String!
    updatedAt: String!
  }

  type AnalysisMetric {
    id: ID!
    name: String!
    value: Float!
    justification: String!
    text: Text
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

  type Tag {
    id: ID!
    name: String!
    value: String
  }

  type Attachment {
    id: ID!
    filename: String!
    mimetype: String!
    url: String!
    size: Int!
  }

  type Feed {
    id: ID!
    url: String!
    name: String!
    pollingPeriod: Int!
    lastPolledAt: String
    sources: [Source!]!
    createdAt: String!
    updatedAt: String!
  }

  input WikiPageInput {
    id: ID
    path: String
    title: String
    content: String!
    language: String
    url: String
    publishedAt: String
    isPublished: Boolean
    tags: [TagInput!]
    textParentId: ID
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

  input WikiFilterInput {
    search: String
    tags: [TagInput!]
    startDate: String
    endDate: String
  }

  input TextFilterInput {
    search: String
    tags: [TagInput!]
    startDate: String
    endDate: String
    isPublished: Boolean
  }

  type Query {
    me: User
    
    # Wiki Core
    wikiPage(path: String!): Source
    wikiTree(parentId: ID): [Source!]!
    sources(filter: WikiFilterInput, skip: Int, take: Int): SourceConnection!
    source(id: ID!): Source
    
    # Analysis & Reports
    reports(status: String): [Report!]!
    report(id: ID!): Report
    
    # Content & Tags
    texts(filter: TextFilterInput, skip: Int, take: Int): TextConnection!
    text(id: ID!): Text
    tags: [Tag!]!
    
    # Feed Review
    feeds: [Feed!]!
    sourcesReview(status: String, skip: Int, take: Int): SourceConnection!
  }

  type FeedPollResult {
    feedId: ID!
    name: String!
    newItems: Int
    error: String
  }

  type Mutation {
    # Wiki Operations
    saveWikiPage(input: WikiPageInput!): Source!
    deleteWikiPage(id: ID!): Boolean!
    
    # Semantic Relations
    addRelation(fromSourceId: ID!, toSourceId: ID!, role: String!, metadata: String): Relation!
    removeRelation(id: ID!): Boolean!

    # Feed & Source Management
    createFeed(url: String!, name: String!, pollingPeriod: Int): Feed!
    updateFeed(id: ID!, url: String, name: String, pollingPeriod: Int): Feed!
    deleteFeed(id: ID!): Boolean!
    pollFeed(id: ID!): Int!
    pollAllFeeds: [FeedPollResult!]!

    batchDeleteSources(ids: [ID!]!): Int!
    batchDiscardSources(ids: [ID!]!): Int!
    
    # Analysis
    analyzePage(sourceId: ID!, textId: ID): Report!
    
    # Support
    addTag(targetId: ID!, targetType: String!, input: TagInput!): Tag!
    removeTag(tagId: ID!, targetId: ID!, targetType: String!): Boolean!
    
    # Text Operations
    initializeTextFromSource(id: ID!, topicId: ID): Text!
  }
`;
