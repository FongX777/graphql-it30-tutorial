const user = (sequelize, DataTypes) => {
  const User = sequelize.define('user', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.TEXT },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: { isEmail: true }
    },
    password: { type: DataTypes.TEXT, allowNull: false },
    age: { type: DataTypes.INTEGER, validate: { min: 1 } }
  });

  const methods = {
    getOneById: id => User.findByPk(id),
    getAll: () => User.findAll(),
    getAllByIds: ids => User.findAll({ where: { id: ids } }),
    getOneByEmail: email => User.findOne({ where: { email } }),
    updateOne: (id, data) =>
      User.findOne({ where: { id } }).then(async user => {
        if (!user) {
          throw new Error('Not found');
        }
        await user.update({
          name: data.name || user.dataValues.name,
          age: data.age || user.dataValues.age
        });
        return User.findByPk(id);
      }),
    createOne: ({ name, email, password }) =>
      User.create({ name, email, password }).then(user => {
        console.log(user);
        return user.dataValues;
      })
  };
  Object.assign(User, methods);

  return User;
};

module.exports = user;
