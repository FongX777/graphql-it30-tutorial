const { gql } = require('apollo-server');
const { createTestClient } = require('apollo-server-testing');
const { constructTestServer } = require('./__utils');

const GET_ME = gql`
  query me {
    me {
      id
      name
      email
      posts {
        id
        title
        body
      }
    }
  }
`;

const GET_USERS = gql`
  query userList {
    users {
      id
      name
      email
      posts {
        id
        title
        body
        author {
          id
          name
        }
        likeGivers {
          id
          name
        }
      }
    }
  }
`;

const GET_USER = gql`
  query user {
    user(id: 1) {
      id
      name
      email
      posts {
        id
        title
        body
      }
    }
  }
`;

const GET_POSTS = gql`
  query postList {
    posts {
      id
      title
      body
      author {
        id
        name
      }
      likeGivers {
        id
        name
      }
    }
  }
`;

const GET_POST = gql`
  query post {
    post(id: 1) {
      id
      title
      body
      author {
        id
        name
      }
      likeGivers {
        id
        name
      }
    }
  }
`;

describe('Queries', () => {
  let query;
  let server;
  beforeEach(() => {
    server = constructTestServer().server;
    query = createTestClient(server).query;
  });

  it('fetches the current user', async () => {
    const res = await query({ query: GET_ME });
    expect(res).toMatchSnapshot();
  });

  it('fetches all users', async () => {
    const res = await query({ query: GET_USERS });
    expect(res).toMatchSnapshot();
  });

  it('fetches single user', async () => {
    const res = await query({ query: GET_USER });
    expect(res).toMatchSnapshot();
  });

  it('fetches all posts', async () => {
    const res = await query({ query: GET_POSTS });
    expect(res).toMatchSnapshot();
  });

  it('fetches single post', async () => {
    const res = await query({ query: GET_POST });
    expect(res).toMatchSnapshot();
  });
});
