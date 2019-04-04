const { typeDefs, resolvers, ApolloServer } = require('../');

module.exports = {
  /**
   * Integration testing utils
   */
  constructTestServer: ({ context } = {}) => {
    const server = new ApolloServer({ typeDefs, resolvers, context });

    return { server };
  }
};
