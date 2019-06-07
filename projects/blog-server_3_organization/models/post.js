module.exports = posts => {
  let lastInsertedId = 2;
  const getOneById = id => {
    const post = posts.find(post => post.id === Number(id));
    if (!post) throw new Error('Post Not Found.');
    return post;
  };
  return {
    getOneById,
    getAll: () => posts,
    getAllByAuthorId: authorId =>
      posts.filter(post => post.authorId === Number(authorId)),
    createOne: ({ authorId, title, body }) => {
      lastInsertedId += 1;
      const post = {
        id: lastInsertedId,
        authorId,
        title,
        body,
        likeGiverIds: [],
        createdAt: new Date().toISOString()
      };
      posts.push(post);
      return post;
    },
    updateOne: (id, { title, body }) => {
      const post = getOneById(id);
      return Object.assign(post, {
        title: title || post.title,
        body: body || post.body
      });
    },
    addOneLikeGiver: (postId, userId) => {
      const post = getOneById(postId);
      if (post.likeGiverIds.includes(userId)) {
        return post;
      }
      post.likeGiverIds.push(userId);
      return post;
    },
    removeOneLikeGiver: (postId, userId) => {
      const post = getOneById(postId);
      if (post.likeGiverIds.includes(userId)) {
        post.likeGiverIds = post.likeGiverIds.filter(id => id !== userId);
        return post;
      }
      return post;
    }
  };
};
