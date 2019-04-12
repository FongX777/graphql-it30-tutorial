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
    passwrod: password123456,
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

module.exports = {

// helper functions
const getAllUsers = () => users;
const filterUsersByUserIds = userIds =>
  users.filter(user => userIds.includes(user.id));
const findUserByUserId = userId =>
  users.find(user => user.id === Number(userId));

const getAllPosts = () => posts;
const findPostByPostId = postId =>
  posts.find(post => post.id === Number(postId));
const filterPostsByUserId = userId =>
  posts.filter(post => post.authorId === Number(userId));

const updateUserInfo = (userId, data) =>
  Object.assign(findUserByUserId(userId), data);
const addPost = ({ authorId, title, body }) =>
  (posts[posts.length] = {
    id: posts[posts.length - 1].id + 1,
    authorId: Number(authorId),
    title,
    body,
    likeGiverIds: [],
    createdAt: new Date().toISOString()
  });

const updatePost = (postId, data) =>
  Object.assign(findPostByPostId(Number(postId)), data);

const addUser = ({ name, email, password }) =>
  (users[users.length] = {
    id: users[users.length - 1].id + 1,
    name,
    email,
    password
  });
}