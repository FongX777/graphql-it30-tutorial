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

  User.findByLogin = async login => {
    let user = await User.findOne({
      where: { name: login }
    });

    if (!user) {
      user = await User.findOne({
        where: { email: login }
      });
    }

    return user;
  };

  return User;
};

module.exports = user;

// mock Data
const password123456 =
  '$2b$04$wcwaquqi5ea1Ho0aKwkZ0e51/RUkg6SGxaumo8fxzILDmcrv4OBIO';
const users = [
  {
    id: 1,
    email: 'fong@test.com',
    password: password123456,
    name: 'Fong',
    age: 23
  },
  {
    id: 2,
    email: 'kevin@test.com',
    password: password123456,
    name: 'Kevin',
    age: 40
  },
  {
    id: 3,
    email: 'mary@test.com',
    password: password123456,
    name: 'Mary',
    age: 18
  }
];

const findUserByUserId = userId =>
  users.find(user => user.id === Number(userId));

module.exports = {
  // helper functions
  getAllUsers: () => users,
  filterUsersByUserIds: userIds =>
    users.filter(user => userIds.includes(user.id)),
  findUserByUserId,
  findUserByEmail: email => users.find(user => user.email === email),

  updateUserInfo: (userId, data) =>
    Object.assign(findUserByUserId(userId), data),

  addUser: ({ name, email, password }) =>
    (users[users.length] = {
      id: users[users.length - 1].id + 1,
      name,
      email,
      password
    })
};
