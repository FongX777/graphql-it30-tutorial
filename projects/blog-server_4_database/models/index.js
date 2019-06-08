const Sequelize = require('sequelize');

module.exports = (database, username, password, storagePath) => {
  // Sequelize constructor api: http://docs.sequelizejs.com/class/lib/sequelize.js~Sequelize.html#instance-constructor-constructor
  const sequelize = new Sequelize(database, username, password, {
    dialect: 'sqlite',
    // the storage engine for sqlite
    // - default ':memory:'
    storage: storagePath
  });

  const userModel = sequelize.import('./user');
  const postModel = sequelize.import('./post');

  // a post must belong to a user
  postModel.belongsTo(
    userModel, // target model
    {
      as: 'author', // post.getAuthor()
      foreignKey: 'authorId' // source table's
    }
  );
  // one user can have more than one psot
  userModel.hasMany(postModel, {
    as: 'posts', // user.getPosts()
    sourceKey: 'id',
    foreignKey: 'id' // where post.id = ?
  });

  const UserPostLike = sequelize.define('user_post_like', {});
  postModel.belongsToMany(userModel, {
    through: UserPostLike,
    as: 'likeGivers'
  });

  return {
    userModel,
    postModel,
    sequelize
  };
};
