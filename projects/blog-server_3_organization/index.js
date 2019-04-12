require('dotenv').config();

const { ApolloServer, gql, ForbiddenError } = require('apollo-server');
// 引入加密套件
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const {
  getAllUsers,
  getAllPosts,
  filterPostsByUserId,
  filterUsersByUserIds,
  findUserByUserId,
  findPostByPostId,
  updateUserInfo,
  addPost,
  updatePost,
  addUser,
  deletePost
} = require('./models');

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS);
const SECRET = process.env.SECRET;

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
    "註冊。 email 與 passwrod 必填"
    signUp(name: String, email: String!, password: String!): User
    "登入"
    login(email: String!, password: String!): Token
  }

  type Token {
    token: String!
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

const hash = (text, saltRounds) => bcrypt.hash(text, saltRounds);

const createToken = ({ id, email, name }, secret) =>
  jwt.sign({ id, email, name }, secret, {
    expiresIn: '1d'
  });

const isAuthenticated = resolverFunc => (parent, args, context) => {
  if (!context.me) throw new ForbiddenError('Not Logged In.');
  return resolverFunc(parent, args, context);
};

// 2. Resolvers 是一個會對照 Schema 中 field 的 function map ，讓你可以計算並回傳資料給 GraphQL Server
const resolvers = {
  Query: {
    hello: () => 'world',
    me: isAuthenticated((root, args, { me }) => findUserByUserId(me.id)),
    users: () => getAllUsers(),
    user: (root, { id }, context) => findUserByUserId(id),
    posts: () => getAllPosts(),
    post: (root, { id }, context) => findPostByPostId(id)
  },
  Mutation: {
    updateMyInfo: isAuthenticated((parent, { input }, { me }) => {
      // 過濾空值
      const data = ['name', 'age'].reduce(
        (obj, key) => (input[key] ? { ...obj, [key]: input[key] } : obj),
        {}
      );

      return updateUserInfo(me.id, data);
    }),
    addPost: (parent, { input }, { me }) => {
      if (!me) throw new Error('Plz Log In First');
      const { title, body } = input;
      return addPost({ authorId: me.id, title, body });
    },
    likePost: (parent, { postId }, { me }) => {
      if (!me) throw new Error('Plz Log In First');
      const post = findPostByPostId(postId);

      if (!post) throw new Error(`Post ${postId} Not Exists`);

      if (!post.likeGiverIds.includes(postId)) {
        return updatePost(postId, {
          likeGiverIds: post.likeGiverIds.concat(me.id)
        });
      }

      return updatePost(postId, {
        likeGiverIds: post.likeGiverIds.filter(id => id === me.id)
      });
    },
    signUp: async (root, { name, email, password }, { saltRounds }) => {
      // 1. 檢查不能有重複註冊 email
      const isUserEmailDuplicate = users.some(user => user.email === email);
      if (isUserEmailDuplicate) throw new Error('User Email Duplicate');

      // 2. 將 passwrod 加密再存進去。非常重要 !!
      const hashedPassword = await hash(password, saltRounds);
      // 3. 建立新 user
      return addUser({ name, email, password: hashedPassword });
    },
    login: async (root, { email, password }, { secret }) => {
      // 1. 透過 email 找到相對應的 user
      const user = users.find(user => user.email === email);
      if (!user) throw new Error('Email Account Not Exists');

      // 2. 將傳進來的 password 與資料庫存的 user.password 做比對
      const passwordIsValid = await bcrypt.compare(password, user.password);
      if (!passwordIsValid) throw new Error('Wrong Password');

      // 3. 成功則回傳 token
      return { token: await createToken(user, secret) };
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
  resolvers,
  context: async ({ req }) => {
    // 1. 取出
    const context = { secret: SECRET, saltRounds: SALT_ROUNDS };
    const token = req.headers['x-token'];
    if (token) {
      try {
        // 2. 檢查 token + 取得解析出的資料
        const me = await jwt.verify(token, SECRET);
        // 3. 放進 context
        return { ...context, me };
      } catch (e) {
        throw new Error('Your session expired. Sign in again.');
      }
    }
    // 如果沒有 token 就回傳空的 context 出去
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
