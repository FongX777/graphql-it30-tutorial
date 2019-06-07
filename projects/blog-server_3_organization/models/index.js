module.exports = ({ users, posts }) => ({
  postModel: require('./post')(posts),
  userModel: require('./user')(users)
});
