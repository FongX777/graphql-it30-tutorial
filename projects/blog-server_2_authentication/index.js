const { ApolloServer, gql, ForbiddenError } = require('apollo-server');
// 引入加密套件
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 2;
const SECRET = 'just_a_random_secret';

// mock Data
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
    "註冊。 email 與 password 必填"
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

// helper functions
const userModel = (users => {
  let lastInsertedId = 3;
  const getOneById = id => users.find(user => user.id === Number(id));
  return {
    getOneById,
    getOneByEmail: email => users.find(user => user.email === email),
    getAll: () => users,
    getAllByIds: userIds => users.filter(user => userIds.includes(user.id)),
    updateOne: (id, { name, age }) => {
      const user = getOneById(id);
      if (!user) throw new Error('User Not Found.');
      return Object.assign(user, {
        name: name || user.name,
        age: age || user.age
      });
    },
    createOne: ({ name, email, password }) => {
      lastInsertedId += 1;
      const user = { id: lastInsertedId, name, email, password };
      users.push(user);
      return user;
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
    me: isAuthenticated((root, args, { me }) => userModel.getOneById(me.id)),
    users: () => userModel.getAll(),
    user: (root, { id }, context) => userModel.getOneById(id),
    posts: () => postModel.getAll(),
    post: (root, { id }, context) => postModel.getOneById(id)
  },
  Mutation: {
    updateMyInfo: isAuthenticated((parent, { input }, { me }) =>
      userModel.updateOne(me.id, input)
    ),

    addPost: isAuthenticated((parent, { input: { title, body } }, { me }) =>
      postModel.createOne({ authorId: me.id, title, body })
    ),

    likePost: isAuthenticated((parent, { postId }, { me }) => {
      const post = postModel.getOneById(postId);
      if (!post) throw new Error(`Post ${postId} Not Exists`);

      // 如果尚未按過讚
      if (!post.likeGiverIds.includes(me.id)) {
        return postModel.addOneLikeGiver(postId, me.id);
      }

      // 如果已經按過讚，就取消
      return postModel.removeOneLikeGiver(postId, me.id);
    }),
    signUp: async (root, { name, email, password }, context) => {
      // 1. 檢查不能有重複註冊 email
      const isUserEmailDuplicate = Boolean(userModel.getOneByEmail(email));
      if (isUserEmailDuplicate) throw new Error('User Email Duplicate');

      // 2. 將 password 加密再存進去。非常重要 !!
      const hashedPassword = await hash(password, SALT_ROUNDS);
      // 3. 建立新 user
      return userModel.createOne({ name, email, password: hashedPassword });
    },
    login: async (root, { email, password }, context) => {
      // 1. 透過 email 找到相對應的 user
      const user = userModel.getOneByEmail(email);
      if (!user) throw new Error('Email Account Not Exists');

      // 2. 將傳進來的 password 與資料庫存的 user.password 做比對
      const passwordIsValid = await bcrypt.compare(password, user.password);
      if (!passwordIsValid) throw new Error('Wrong Password');

      // 3. 成功則回傳 token
      return { token: await createToken(user, SECRET) };
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
  resolvers,
  context: async ({ req }) => {
    // 1. 取出
    const token = req.headers['x-token'];
    if (token) {
      try {
        // 2. 檢查 token + 取得解析出的資料
        const me = await jwt.verify(token, SECRET);
        // 3. 放進 context
        return { me };
      } catch (e) {
        throw new Error('Your session expired. Sign in again.');
      }
    }
    // 如果沒有 token 就回傳空的 context 出去
    return {};
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
