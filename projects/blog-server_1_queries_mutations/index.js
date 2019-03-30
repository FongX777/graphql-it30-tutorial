const { ApolloServer, gql } = require('apollo-server');

// 1. GraphQL Schema 定義
const typeDefs = gql`
  type Query {
    "A simple type for getting started!"
    hello: String
  }
`;

// 2. Resolvers 是一個會對照 Schema 中 field 的 function map ，讓你可以計算並回傳資料給 GraphQL Server
const resolvers = {
  Query: {
    // 需注意名稱一定要對到 Schema 中 field 的名稱
    hello: () => 'world'
  }
};

// 3. 初始化 Web Server ，需傳入 typeDefs (Schema) 與 resolvers (Resolver)
const server = new ApolloServer({
  // Schema 部分
  typeDefs,
  // Resolver 部分
  resolvers
});

// 4. 啟動 Server
server.listen().then(({ url }) => {
  console.log(`? Server ready at ${url}`);
});
