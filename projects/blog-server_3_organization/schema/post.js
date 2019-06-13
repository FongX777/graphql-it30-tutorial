const { gql, ForbiddenError } = require('apollo-server');

const typeDefs = gql`
  extend type Query {
    "取得所有貼文"
    posts: [Post]
    "依照 id 取得特定貼文"
    post(id: ID!): Post
  }

  extend type Mutation {
    addPost(input: AddPostInput!): Post
    likePost(postId: ID!): Post
  }

  input AddPostInput {
    title: String!
    body: String
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

const isAuthenticated = resolverFunc => (parent, args, context) => {
  if (!context.me) throw new ForbiddenError('Not Logged In.');
  return resolverFunc(parent, args, context);
};

// 2. Resolvers 是一個會對照 Schema 中 field 的 function map ，讓你可以計算並回傳資料給 GraphQL Server
const resolvers = {
  Query: {
    posts: (_, __, { dataSources }) => dataSources.postModel.getAll(),
    post: (_, { id }, { dataSources }) => dataSources.postModel.getOneById(id)
  },
  Mutation: {
    addPost: isAuthenticated((parent, { input }, { me, dataSources }) => {
      const { title, body } = input;
      return dataSources.postModel.createOne({ authorId: me.id, title, body });
    }),
    likePost: isAuthenticated((parent, { postId }, { me, dataSources }) => {
      const post = dataSources.postModel.getOneById(postId);
      if (!post) throw new Error(`Post ${postId} Not Exists`);

      // 如果尚未按過讚
      if (!post.likeGiverIds.includes(me.id)) {
        return dataSources.postModel.addOneLikeGiver(postId, me.id);
      }

      // 如果已經按過讚，就取消
      return dataSources.postModel.removeOneLikeGiver(postId, me.id);
    })
  },
  Post: {
    author: (parent, args, { dataSources }) =>
      dataSources.userModel.getOneById(parent.authorId),
    likeGivers: (parent, args, { dataSources }) =>
      dataSources.userModel.getAllByIds(parent.likeGiverIds)
  }
};

module.exports = { typeDefs, resolvers };
