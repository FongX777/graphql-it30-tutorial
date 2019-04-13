require('dotenv').config();

const { ApolloServer } = require('apollo-server');
const { typeDefs, resolvers } = require('./schema');
const { userModel, postModel } = require('./models');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS);
const SECRET = process.env.SECRET;

// 3. Initate a Web Server, Need typeDefs (Schema) and resolvers (Resolver)
const server = new ApolloServer({
  // Schema 部分
  typeDefs,
  // Resolver 部分
  resolvers,
  dataSources: () => ({ userModel, postModel }),
  context: async ({ req }) => {
    const context = { secret: SECRET, saltRounds: SALT_ROUNDS };
    const token = req.headers['x-token'];
    if (token) {
      try {
        const me = await jwt.verify(token, SECRET);
        return { ...context, me };
      } catch (e) {
        throw new Error('Your session expired. Sign in again.');
      }
    }
    return context;
  }
});

// 4. Activate Server
if (process.env.NODE_ENV !== 'test') {
  server.listen().then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
}

module.exports = {
  ApolloServer,
  typeDefs,
  resolvers
};
