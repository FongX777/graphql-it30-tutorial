const { typeDefs, resolvers, ApolloServer } = require('../');

module.exports = {
  /**
   * Integration testing utils
   */
  constructTestServer: () => {
    const server = new ApolloServer({ typeDefs, resolvers });

    return { server };
  }
};
