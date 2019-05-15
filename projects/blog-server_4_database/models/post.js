const post = (sequelize, DataTypes) => {
  const Post = sequelize.define('post', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    title: { type: DataTypes.TEXT, allowNull: false },
    body: { type: DataTypes.TEXT, defaultValue: '' },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  Post.getAll = async () => {
    const posts = await Post.findAll();
    return posts;
  };

  return Post;
};

module.exports = post;

//
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

const findPostByPostId = postId =>
  posts.find(post => post.id === Number(postId));

module.exports = {
  getAllPosts: () => posts,
  findPostByPostId,
  filterPostsByUserId: userId =>
    posts.filter(post => post.authorId === Number(userId)),
  addPost: ({ authorId, title, body }) =>
    (posts[posts.length] = {
      id: posts[posts.length - 1].id + 1,
      authorId: Number(authorId),
      title,
      body,
      likeGiverIds: [],
      createdAt: new Date().toISOString()
    }),

  updatePost: (postId, data) =>
    Object.assign(findPostByPostId(Number(postId)), data)
};
