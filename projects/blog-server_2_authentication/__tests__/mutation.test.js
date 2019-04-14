const { gql } = require('apollo-server');
const { createTestClient } = require('apollo-server-testing');
const { constructTestServer } = require('./__utils');

const LOGIN = gql`
  mutation($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
    }
  }
`;

const SIGNUP = gql`
  mutation($email: String!, $password: String!, $name: String!) {
    signUp(name: $name, email: $email, password: $password) {
      id
      name
      email
    }
  }
`;

const SIGNUP_AND_LOGIN = gql`
  mutation($email: String!, $password: String!, $name: String!) {
    signUp(name: $name, email: $email, password: $password) {
      id
      name
      email
    }
    login(email: $email, password: $password) {
      token
    }
  }
`;

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

describe('Mutations - Positive Tests', () => {
  let mutate;
  let server;
  beforeEach(() => {
    server = constructTestServer({
      context: () => ({
        me: { id: 1, email: 'fong@test.com', name: 'fong' }
      })
    }).server;
    mutate = createTestClient(server).mutate;
  });

  it('login', async () => {
    const res = await mutate({
      mutation: LOGIN,
      variables: { email: 'fong@test.com', password: '123456' }
    });
    // check if token exists
    expect(Boolean(res.data.login.token)).toBeTruthy();
  });

  it('signup and login', async () => {
    const email = 'test@test.com';
    const password = '123456';
    const name = 'Test';

    const res = await mutate({
      mutation: SIGNUP_AND_LOGIN,
      variables: { email, password, name }
    });
    // check if token exists
    expect(res.data.signUp).toEqual({
      id: '4',
      name,
      email
    });
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

describe('Mutations - Negative Tests', () => {
  let mutate;
  let server;
  beforeEach(() => {
    server = constructTestServer({
      context: () => ({
        // me: { id: 1, email: 'fong@test.com', name: 'fong' }
      })
    }).server;
    mutate = createTestClient(server).mutate;
  });

  it('login with false email', async () => {
    const falseEmail = 'xxxx@test.com';
    const res = await mutate({
      mutation: LOGIN,
      variables: { email: falseEmail, password: '123456' }
    });
    expect(res).toMatchSnapshot();
  });

  it('login with false password', async () => {
    const falsePassword = '111111';
    const res = await mutate({
      mutation: LOGIN,
      variables: { email: 'fong@test.com', password: falsePassword }
    });
    expect(res).toMatchSnapshot();
  });

  it('signup with duplicate email', async () => {
    const duplicateEmail = 'fong@test.com';
    const res = await mutate({
      mutation: SIGNUP,
      variables: { email: duplicateEmail, password: '123456', name: 'Test' }
    });
    expect(res).toMatchSnapshot();
  });

  describe('Not Logged In.', () => {
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
});
