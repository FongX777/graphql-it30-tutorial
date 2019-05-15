const Sequelize = require('sequelize');

module.exports = (database, username, password) => {
  // Sequelize constructor api: http://docs.sequelizejs.com/class/lib/sequelize.js~Sequelize.html#instance-constructor-constructor
  const sequelize = new Sequelize(database, username, password, {
    dialect: 'sqlite'
    // the storage engine for sqlite
    // - default ':memory:'
    // storage: 'path/to/database.sqlite'
  });
  return {
    userModel: sequelize.import('./user'),
    postModel: sequelize.import('./post'),
    sequelize
  };
};
