const { gql } = require('apollo-server');
const { createTestClient } = require('apollo-server-testing');
const { constructTestServer } = require('./__utils');

const UPDATE_MY_INFO = gql`
  mutation {
    updateMyInfo(input: { name: "fx", age: 100 }) {
      id
      name
      email
      age
    }
  }
`;

const ADD_POST = gql`
  mutation {
    addPost(input: { title: "Hello World2", body: "testinggggg" }) {
      id
      title
      body
      author {
        id
        name
      }
    }
  }
`;

const LIKE_POST = gql`
  mutation {
    likePost(postId: 2) {
      id
      title
      body
      author {
        name
      }
      likeGivers {
        id
        name
        age
      }
    }
  }
`;

describe('Mutations', () => {
  let mutate;
  let server;
  beforeEach(() => {
    server = constructTestServer().server;
    mutate = createTestClient(server).mutate;
  });

  it('update my info', async () => {
    const res = await mutate({ mutation: UPDATE_MY_INFO });
    expect(res).toMatchSnapshot();
  });

  it('add a post', async () => {
    const res = await mutate({ mutation: ADD_POST });
    expect(res).toMatchSnapshot();
  });

  it('like a post', async () => {
    const res = await mutate({ mutation: LIKE_POST });
    expect(res).toMatchSnapshot();
  });
});
