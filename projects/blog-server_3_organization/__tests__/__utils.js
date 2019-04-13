const { typeDefs, resolvers, ApolloServer, dataSources } = require('../');

module.exports = {
  /**
   * Integration testing utils
   */
  constructTestServer: ({ context } = {}) => {
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context,
      dataSources
    });

    return { server };
  }
};
