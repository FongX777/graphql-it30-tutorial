const { gql, ForbiddenError } = require('apollo-server');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const typeDefs = gql`
  extend type Query {
    "取得目前使用者"
    me: User
    "取得所有使用者"
    users: [User]
    "依照 id 取得特定使用者"
    user(id: ID!): User
  }

  extend type Mutation {
    updateMyInfo(input: UpdateMyInfoInput!): User
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
    me: isAuthenticated((root, args, { me, dataSources }) =>
      dataSources.userModel.findUserByUserId(me.id)
    ),
    users: (_, __, { dataSources }) => dataSources.userModel.getAllUsers(),
    user: (root, { id }, { dataSources }) =>
      dataSources.userModel.findUserByUserId(id)
  },
  Mutation: {
    updateMyInfo: isAuthenticated((parent, { input }, { me, dataSources }) => {
      // 過濾空值
      const data = ['name', 'age'].reduce(
        (obj, key) => (input[key] ? { ...obj, [key]: input[key] } : obj),
        {}
      );

      return dataSources.userModel.updateUserInfo(me.id, data);
    }),
    signUp: async (
      root,
      { name, email, password },
      { saltRounds, dataSources }
    ) => {
      const isUserEmailDuplicate = Boolean(
        dataSources.userModel.findUserByEmail(email)
      );
      if (isUserEmailDuplicate) throw new Error('User Email Duplicate');

      const hashedPassword = await hash(password, saltRounds);
      return dataSources.userModel.addUser({
        name,
        email,
        password: hashedPassword
      });
    },
    login: async (root, { email, password }, { secret, dataSources }) => {
      const user = dataSources.userModel.findUserByEmail(email);
      if (!user) throw new Error('Email Account Not Exists');

      const passwordIsValid = await bcrypt.compare(password, user.password);
      if (!passwordIsValid) throw new Error('Wrong Password');

      return { token: await createToken(user, secret) };
    }
  },
  User: {
    posts: (parent, args, { dataSources }) =>
      dataSources.postModel.filterPostsByUserId(parent.id)
  }
};

module.exports = { typeDefs, resolvers };
