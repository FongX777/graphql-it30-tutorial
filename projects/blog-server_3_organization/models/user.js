module.exports = users => {
  let lastInsertedId = 3;
  const getOneById = id => {
    const user = users.find(user => user.id === Number(id));
    if (!user) throw new Error('User Not Found.');
    return user;
  };
  return {
    getOneById,
    getOneByEmail: email => users.find(user => user.email === email),
    getAll: () => users,
    getAllByIds: userIds => users.filter(user => userIds.includes(user.id)),
    updateOne: (id, { name, age }) => {
      const user = getOneById(id);
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
};
