const { gql } = require('apollo-server');
const post = require('./post');
const user = require('./user');

// 1. GraphQL Schema 定義
const typeDefs = gql`
  type Query {
    "測試用 Hello World"
    hello: String
  }

  type Mutation {
    hello: String
  }
`;

const resolvers = {
  Query: { hello: () => 'world' },
  Mutation: { hello: () => 'world' }
};

module.exports = {
  typeDefs: [typeDefs, user.typeDefs, post.typeDefs],
  resolvers: [resolvers, user.resolvers, post.resolvers]
};
