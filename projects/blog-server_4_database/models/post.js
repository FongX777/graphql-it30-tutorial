const post = (sequelize, DataTypes) => {
  const Post = sequelize.define('post', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    // authorId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.TEXT, allowNull: false },
    body: { type: DataTypes.TEXT, defaultValue: '' },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const toDataValues = result => result.dataValues;

  const methods = {
    getOneById: id => Post.findByPk(id).then(toDataValues),
    getAll: () => Post.findAll(),
    getAllByAuthorId: authorId =>
      Post.findAll({ where: { authorId: authorId } }),
    createOne: ({ authorId, title, body }) =>
      Post.create({ title, body, authorId }).then(post => post.dataValues),
    updateOne: (id, data) => Post.update(data, { where: { id } }),
    addOneLikeGiver: (postId, userId) =>
      Post.findByPk(postId)
        .then(post => post.addLikeGivers([userId]))
        .then(() => Post.findByPk(postId))
        .then(toDataValues),
    removeOneLikeGiver: (postId, userId) =>
      Post.findByPk(postId)
        .then(post => post.removeLikeGivers([userId]))
        .then(() => Post.findByPk(postId))
        .then(toDataValues),
    getLikeGivers: id =>
      Post.findByPk(id).then(async post => post.getLikeGivers())
  };
  Object.assign(Post, methods);

  return Post;
};

module.exports = post;
