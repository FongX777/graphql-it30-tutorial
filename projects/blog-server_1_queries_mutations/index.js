const { ApolloServer, gql } = require('apollo-server');

// mock Data
const ME_ID = 1;
const PASSWORD_123456 =
  '$2b$04$wcwaquqi5ea1Ho0aKwkZ0e51/RUkg6SGxaumo8fxzILDmcrv4OBIO';
const USERS = [
  {
    id: 1,
    email: 'fong@test.com',
    password: PASSWORD_123456,
    name: 'Fong',
    age: 23
  },
  {
    id: 2,
    email: 'kevin@test.com',
    password: PASSWORD_123456,
    name: 'Kevin',
    age: 40
  },
  {
    id: 3,
    email: 'mary@test.com',
    password: PASSWORD_123456,
    name: 'Mary',
    age: 18
  }
];

const POSTS = [
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
const userModel = (users => {
  const getOneById = id => users.find(user => user.id === Number(id));
  return {
    getOneById,
    getAll: () => users,
    getAllByIds: userIds => users.filter(user => userIds.includes(user.id)),
    updateOne: (id, { name, age }) => {
      const user = getOneById(id);
      if (!user) throw new Error('User Not Found.');
      return Object.assign(user, {
        name: name || user.name,
        age: age || user.age
      });
    }
  };
})(USERS);

const postModel = (posts => {
  let lastInsertedId = 2;
  const getOneById = id => posts.find(post => post.id === Number(id));
  return {
    getOneById,
    getAll: () => posts,
    getAllByAuthorId: authorId =>
      posts.filter(post => post.authorId === Number(authorId)),
    createOne: ({ authorId, title, body }) => {
      lastInsertedId += 1;
      const post = {
        id: lastInsertedId,
        authorId,
        title,
        body,
        likeGiverIds: [],
        createdAt: new Date().toISOString()
      };
      posts.push(post);
      return post;
    },
    updateOne: (id, { title, body }) => {
      const post = getOneById(id);
      if (!post) throw new Error('Post Not Found.');
      return Object.assign(post, {
        title: title || post.title,
        body: body || post.body
      });
    },
    addOneLikeGiver: (postId, userId) => {
      const post = getOneById(postId);
      if (!post) throw new Error('Post Not Found.');
      if (post.likeGiverIds.includes(userId)) {
        return post;
      }
      post.likeGiverIds.push(userId);
      return post;
    },
    removeOneLikeGiver: (postId, userId) => {
      const post = getOneById(postId);
      if (!post) throw new Error('Post Not Found.');
      if (post.likeGiverIds.includes(userId)) {
        post.likeGiverIds = post.likeGiverIds.filter(id => id !== userId);
        return post;
      }
      return post;
    }
  };
})(POSTS);

// 2. Resolvers 是一個會對照 Schema 中 field 的 function map ，讓你可以計算並回傳資料給 GraphQL Server
// A resolver is a function that resolves a value for a type or field in a schema.
const resolvers = {
  Query: {
    hello: () => 'world',
    me: () => userModel.getOneById(ME_ID),
    users: () => userModel.getAll(),
    user: (root, { id }, context) => userModel.getOneById(id),
    posts: () => postModel.getAll(),
    post: (root, { id }, context) => postModel.getOneById(id)
  },
  Mutation: {
    updateMyInfo: (parent, { input }, context) =>
      userModel.updateOne(ME_ID, input),

    addPost: (parent, { input: { title, body } }, context) =>
      postModel.createOne({ authorId: ME_ID, title, body }),

    likePost: (parent, { postId }, context) => {
      const post = postModel.getOneById(postId);
      if (!post) throw new Error(`Post ${postId} Not Exists`);

      // 如果尚未按過讚
      if (!post.likeGiverIds.includes(ME_ID)) {
        return postModel.addOneLikeGiver(postId, ME_ID);
      }

      // 如果已經按過讚，就取消
      return postModel.removeOneLikeGiver(postId, ME_ID);
    }
  },
  User: {
    posts: (parent, args, context) => postModel.getAllByAuthorId(parent.id)
  },
  Post: {
    author: (parent, args, context) => userModel.getOneById(parent.authorId),
    likeGivers: (parent, args, context) =>
      userModel.getAllByIds(parent.likeGiverIds)
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
