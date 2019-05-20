const post = (sequelize, DataTypes) => {
  const Post = sequelize.define('post', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    // authorId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.TEXT, allowNull: false },
    body: { type: DataTypes.TEXT, defaultValue: '' },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const methods = {
    getOneById: id => Post.findByPk(id), // findPostByPostId: postId => {},
    getAll: () => Post.findAll(), // getAllPosts: () => {},
    getAllByAuthorId: authorId =>
      Post.findAll({ where: { authorId: authorId } }), // filterPostsByUserId: userId => {},
    createOne: ({ authorId, title, body }) =>
      Post.create({ title, body, authorId }).then(post => post.dataValues), // addPost
    updateOne: (id, data) => Post.update(data, { where: { id } }), // updatePost: (postId, data) => {}
    addOneLikeGiver: (postId, userId) =>
      Post.findByPk(postId)
        .then(post => post.addLikeGivers([userId]))
        .then(() => Post.findByPk(postId)),
    removeOneLikeGiver: (postId, userId) =>
      Post.findByPk(postId)
        .then(post => post.removeLikeGivers([userId]))
        .then(() => Post.findByPk(postId)),
    getLikeGivers: id =>
      Post.findByPk(id).then(async post => post.getLikeGivers())
  };
  Object.assign(Post, methods);

  return Post;
};

module.exports = post;
