const { ApolloServer, gql } = require('apollo-server');

// mock Data
const meId = 1;
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
    passwrod: password123456,
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

// 1. GraphQL Schema 定義
const typeDefs = gql`
  type Query {
    "測試用 Hello World"
    hello: String
    "取得目前使用者"
    me: User
    "取得所有使用者"
    users: [User]
    "依照 id 取得特定使用者"
    user(id: ID!): User
    "取得所有貼文"
    posts: [Post]
    "依照 id 取得特定貼文"
    post(id: ID!): Post
  }

  type Mutation {
    updateMyInfo(input: UpdateMyInfoInput!): User
    addPost(input: AddPostInput!): Post
    likePost(postId: ID!): Post
  }

  input UpdateMyInfoInput {
    name: String
    age: Int
  }

  input AddPostInput {
    title: String!
    body: String
  }

  """
  使用者
  """
  type User {
    "識別碼"
    id: ID!
    "帳號 email"
    email: String!
    "名字"
    name: String
    "年齡"
    age: Int
    "貼文"
    posts: [Post]
  }

  """
  貼文
  """
  type Post {
    "識別碼"
    id: ID!
    "作者"
    author: User
    "標題"
    title: String
    "內容"
    body: String
    "按讚者"
    likeGivers: [User]
    "建立時間 (ISO 格式)"
    createdAt: String
  }
`;

// helper functions
const getAllUsers = () => users;
const filterUsersByUserIds = userIds =>
  users.filter(user => userIds.includes(user.id));
const findUserByUserId = userId =>
  users.find(user => user.id === Number(userId));

const getAllPosts = () => posts;
const findPostByPostId = postId =>
  posts.find(post => post.id === Number(postId));
const filterPostsByUserId = userId =>
  posts.filter(post => post.authorId === Number(userId));

const updateUserInfo = (userId, data) =>
  Object.assign(findUserByUserId(userId), data);
const addPost = ({ authorId, title, body }) =>
  (posts[posts.length] = {
    id: posts.length + 1,
    authorId,
    title,
    body,
    likeGiverIds: [],
    createdAt: new Date().toISOString()
  });

const updatePost = (postId, data) =>
  Object.assign(findPostByPostId(postId), data);

// 2. Resolvers 是一個會對照 Schema 中 field 的 function map ，讓你可以計算並回傳資料給 GraphQL Server
// A resolver is a function that resolves a value for a type or field in a schema.
const resolvers = {
  Query: {
    hello: () => 'world',
    me: () => findUserByUserId(meId),
    users: () => getAllUsers(),
    user: (root, { id }, context) => findUserByUserId(id),
    posts: () => getAllPosts(),
    post: (root, { id }, context) => findPostByPostId(id)
  },
  Mutation: {
    updateMyInfo: (parent, { input }, context) => updateUserInfo(meId, input),

    addPost: (parent, { input: { title, body } }, context) =>
      addPost({ authorId: meId, title, body }),

    likePost: (parent, { postId }, context) => {
      const post = findPostByPostId(postId);

      if (!post) throw new Error(`Post ${postId} Not Exists`);

      // 如果尚未按過讚
      if (!post.likeGiverIds.includes(meId)) {
        return updatePost(postId, {
          likeGiverIds: post.likeGiverIds.concat(meId)
        });
      }

      // 如果已經按過讚，就取消
      return updatePost(postId, {
        likeGiverIds: post.likeGiverIds.filter(id => id !== meId)
      });
    }
  },
  User: {
    posts: (parent, args, context) => filterPostsByUserId(parent.id)
  },
  Post: {
    author: (parent, args, context) => findUserByUserId(parent.authorId),
    likeGivers: (parent, args, context) =>
      filterUsersByUserIds(parent.likeGiverIds)
  }
};

// 3. Initate a Web Server, Need typeDefs (Schema) and resolvers (Resolver)
const server = new ApolloServer({
  // Schema 部分
  typeDefs,
  // Resolver 部分
  resolvers
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
