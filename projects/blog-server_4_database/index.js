require('dotenv').config();

const { ApolloServer } = require('apollo-server');
const { typeDefs, resolvers } = require('./schema');
const { userModel, postModel, sequelize } = require('./models')(
  process.env.DATABASE_NAME,
  process.env.DATABASE_USER,
  process.env.DATABASE_PASSWORD
);
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS);
const SECRET = process.env.SECRET;

const password123456 =
  '$2b$04$wcwaquqi5ea1Ho0aKwkZ0e51/RUkg6SGxaumo8fxzILDmcrv4OBIO';
const users = [
  {
    id: 1,
    email: 'fong@test.com',
    password: password123456,
    name: 'Fong',
    age: 23
  },
  {
    id: 2,
    email: 'kevin@test.com',
    password: password123456,
    name: 'Kevin',
    age: 40
  },
  {
    id: 3,
    email: 'mary@test.com',
    password: password123456,
    name: 'Mary',
    age: 18
  }
];

const posts = [
  {
    id: 1,
    authorId: 1,
    title: 'Hello World',
    body: 'This is my first post',
    likeGiverIds: [2],
    createdAt: '2019-03-10 07:54:06'
  },
  {
    id: 2,
    authorId: 2,
    title: 'Nice Day',
    body: 'Hello My Friend!',
    likeGiverIds: [],
    createdAt: '2019-03-20 17:54:06'
  }
];

const dataSources = () => ({ userModel, postModel });
const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources,
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
  sequelize.sync().then(() => {
    seedDb();
    server.listen().then(({ url }) => {
      console.log(`🚀 Server ready at ${url}`);
    });
  });
}

const seedDb = async () => {
  // bulkCreate api: https://sequelize.readthedocs.io/en/v3/docs/instances/#working-in-bulk-creating-updating-and-destroying-multiple-rows-at-once
  userModel
    .bulkCreate(users, {
      validate: true
    })
    .then(() => console.log('Users inserted'));
  postModel
    .bulkCreate(posts, {
      validate: true
    })
    .then(() => console.log('Posts inserted'));
};

module.exports = {
  ApolloServer,
  typeDefs,
  resolvers,
  dataSources
};
