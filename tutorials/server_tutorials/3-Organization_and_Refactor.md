# 打造一個 GraphQL API Server 應用：部落格社交軟體 - 3 (環境變數 & 整理)

![header](https://ithelp.ithome.com.tw/upload/images/20181016/20111997WWqgh86nkr.png)

終於來到實戰文章第三篇了，其實當初想說晚一點釋出或是分個 6 篇來發哈哈，但為了想要之後可以專心多講解一些中階以上的概念所以提早將這系列文章發出來！其實原本只規劃到昨天講完認證就結束，雖然該講的都有講到但是離一個完整的 project 仍缺少許多東西。

今天來先來整理一下程式碼的架構，讓明天加入 DB 能夠更順利。

---

在開始之前，有看過昨天教學的朋友一定有注意到我犯了一個如果是正式環境下絕不能犯的錯誤，那就是**將 SECRET 暴露在程式之中**。這是非常危險的行為，因為這樣如果有人看到你的程式碼就能得知你的 Secret ，這樣就有可能發生一些壞壞的事情！所以實務上作法都是放在**環境變數**裡面，當線上機器在執行時都另外設定這些環境變數，讓程式在執行時才能取得機密資訊。

除了 Secret ，還有一些機密資訊如 Database 的位址與密碼等等，基本上都是要藏得好好的 !

## 1. 安裝 dotenv

這邊有人問為什麼需要 dotenv ? 比如我可以直接用 `SECRET=just_some_secret node index.js` 開啟 Server 後，在程式中用

```js
const SECRET = process.env.SECRET;
```

來取得值。但這種方法遇到大量環境變數時就非常難以管理及擴張。

### 1-1. 使用 `.env` 檔案

因此我們用 dotenv 來幫我們做管理～～首先安裝 `dotenv` 套件，並新增一個 `.env` 檔案存放環境變數

```bash
$ npm install --save dotenv
$ touch .env
```

打開 `.env` 在裡面輸入

```
// .env
# JWT Setting
SECRET=just_some_secret
# Bcrypt Setting
SALT_ROUNDS=2
```

接著在 `index.js` 最上方新增一行 code

```js
require('dotenv').config();

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS);
const SECRET = process.env.SECRET;
```

就可以使用讓程式中的 `process.env` 直接存取 `.env` 檔案裡面的設定囉～～
這邊可以用 `console.log` 來輸出看看是否成功！

此外要記得**將 `.env` 加進 `.gitignore` 裡面**，免得一起上傳到 Github 等處努力就白費了 QQ

### 1-2. 將環境變數加入 `context` 中

```diff
+ const hash = (text, saltRounds) => bcrypt.hash(text, saltRounds)

+ const createToken = ({ id, email, name }, secret) =>
+  jwt.sign({ id, email, name }, secret, {
    expiresIn: '1d'
  })


const resolvers = {
 ...,
 Mutation: {
   ...,
    signUp: async (root, { name, email, password }, { saltRounds }) => {
      const isUserEmailDuplicate = users.some(user => user.email === email)
      if (isUserEmailDuplicate) throw new Error('User Email Duplicate')

+     const hashedPassword = await hash(password, saltRounds)
      return addUser({
        name,
        email,
        password: hashedPassword,
        friendIds: []
      })
    },
+    login: async (root, { email, password }, { secret }) => {
      const user = users.getAllUsers().find(user => user.email === email)
      if (!user) throw new Error('Email Account Not Exists')

+     const passwordIsValid = await bcrypt.compare(password, user.password)
      if (!passwordIsValid) throw new AuthenticationError('Wrong Password')

+      return { token: await createToken(user, secret) }
    }
  }
 }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
+    const context = { secret: SECRET, saltRounds: SALT_ROUNDS };
    const token = req.headers['x-token']
    if (token) {
      try {
+        const me = await jwt.verify(token, SECRET)
        return { ...context, me }
      } catch (e) {
        throw new Error('Your session expired. Sign in again.')
      }
    }
+    return context
  }
})
```

## 2. Organize Your Code

目前的程式碼都混在一個 `index.js` ，雖然以教學及 demo 來說很方便，但畢竟不適合程式碼擴展。

### 2-1. 資料處理邏輯層 Model Layer

#### 將資料處裡分到 `/models` 中

接下來是資料處理邏輯，因為我們目前都是使用 memory 裡的資料且架構相對簡單所以放在 `index.js` 中，但隨著程式架構越來越複雜，會將不同概念的程式分離出來，因此資料處理層最好獨立出來，這樣也符合 RSP 原則 !

所以先新增一個 `model` 資料夾並在裡面新增 `model/index.js` 並把 `posts` 與 `users` 以及一系列 helper functions 放進去並 export `model` 出來，如下。

```js
// models/index.js
const users = [ ... ];
const posts = [ ... ];

const findUserByUserId = ...;
const findPostByPostId = ...;

module.exports = {
  getAllUsers: ...,
  getAllPosts: ...,
  filterPostsByUserId: ...,
  filterUsersByUserIds: ...,
  findUserByUserId: ...,
  findUserByName: ...,
  findPostByPostId: ...,
  updateUserInfo: ...,
  addPost: ...,
  updatePost: ...,
  addUser: ...,
  deletePost: ...,
}
```

接著把 `index.js` 裡面的資料與 helper functions 移除並改由 import 方式引入。

```js
// index.js
const {
  getAllUsers,
  getAllPosts,
  filterPostsByUserId,
  filterUsersByUserIds,
  findUserByUserId,
  findUserByName,
  findPostByPostId,
  updateUserInfo,
  addPost,
  updatePost,
  addUser,
  deletePost
} = require('./models');
...

const resolvers = {
  Query: {
    ...,
    users: () => getAllUsers(),
    posts: () => getAllPosts(),
    ...
  },
  ...
}
```

#### 將資料處理分類： Model 化

不過過多的 function 難以管理，將他們 Model 化！

1. 新增 `model/user.js` 將 user 的資料與 helper functions 放進去並 eport 出來

```js
const users = [ ... ];

const findUserByUserId = ...;

module.exports = {
  getAllUsers: ...,
  filterUsersByUserIds: ...,
  findUserByName: ...,
  updateUserInfo: ...,
  addUser: ...,
}
```

2. 新增 `model/post.js` 將 user 的資料與 helper functions 放進去並 eport 出來

```
const posts = [ ... ];

const findPostByPostId = ...;

module.exports = {
  getAllPosts: ...,
  filterPostsByUserId: ...,
  addPost: ...,
  updatePost: ...,
  deletePost: ...,
}

```

3. 清除 `model/index.js` 並把以上兩個檔案 import 進來

```
const userModel = require('./user')
const postModel = require('./post')

module.exports = {
  userModel,
  postModel
}
```

#### 將 models 放進 `context` 中

接下來是今天的大工程！讓我們來修改 `index.js` 的檔案，首先先引入與加進 `context`

```diff
+ const { userModel, postModel } = require('./models')

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const context = {
      secret: SECRET,
      saltRounds: SALT_ROUNDS,
+      userModel,
+      postModel
    }
    const token = req.headers['x-token']
    if (token) {
      try {
        const me = await jwt.verify(token, SECRET)
        return { ...context, me }
      } catch (e) {
        throw new Error('Your session expired. Sign in again.')
      }
    }
    return context
  }
})
```

舉 `isPostAuthor` 為例：

```diff
const isPostAuthor = resolverFunc => (parent, args, context) => {
  const { postId } = args
+  const { me, postModel } = context
+  const isAuthor = postModel.findPostByPostId(Number(postId)).authorId === me.id
  if (!isAuthor) throw new ForbiddenError('Only Author Can Delete this Post')
  return resolverFunc.applyFunc(parent, args, context)
}
```

再舉 Query 為例：

```diff
const resolvers = {
  Query: {
    hello: () => 'world',
+    me: isAuthenticated((root, args, { me, userModel }) =>
+      userModel.findUserByUserId(me.id)
    ),
+    users: (root, args, { userModel }) => userModel.getAllUsers(),
+    user: (root, { name }, { userModel }) => userModel.findUserByName(name),
+    posts: (root, args, { postModel }) => postModel.getAllPosts(),
+    post: (root, { id }, { postModel }) =>
+      postModel.findPostByPostId(Number(id))
  },
  User: {
+    posts: (parent, args, { postModel }) =>
+      postModel.filterPostsByUserId(parent.id),
+    friends: (parent, args, { userModel }) =>
+      userModel.filterUsersByUserIds(parent.friendIds || [])
  },
  Post: {
+    author: (parent, args, { userModel }) =>
+      userModel.findUserByUserId(parent.authorId),
+    likeGivers: (parent, args, { userModel }) =>
+      userModel.filterUsersByUserIds(parent.likeGiverIds)
  },
  Mutation: { ... }
}
```

至於 Mutation 就交給大家練習囉～之後也會把程式碼放上來。

### 2-2. Schema Layer (TypeDefs + Resolvers)

將 `models` 放入 `context` 後要改 Schema 就容易多了！

#### 將 GraphQL 分到 `/schema` 中

首先是 Schema ，先新增一個 `schema` 資料夾並在裡面新增 `schema/index.js` 並把 `index.js` 中關於 Schema 部分的程式碼放進去並 export 出來，如下。

```js
// schema/index.js
const {
  gql,
  ForbiddenError,
  AuthenticationError
} = require('apollo-server')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const typeDefs = gql` ... `;

const hash = ...;
const createToken = ...;

const isAuthenticated = ...;
const isPostAuthor = ...;

// Resolvers
const resolvers = { ... };

module.exports = {
  typeDefs,
  resolvers
};
```

再來把以上的程式碼 import 進 `index.js` ，你會發現 `index.js` 變得超級簡潔！

```diff
const { ApolloServer } = require('apollo-server')
const jwt = require('jsonwebtoken')

+ const { typeDefs, resolvers } = require('./schema')
const { userModel, postModel } = require('./models')

require('dotenv').config()

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS)
const SECRET = process.env.SECRET

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const context = {
      secret: SECRET,
      saltRounds: SALT_ROUNDS,
      userModel,
      postModel
    }
    const token = req.headers['x-token']
    if (token) {
      try {
        const me = await jwt.verify(token, SECRET)
        return { ...context, me }
      } catch (e) {
        throw new Error('Your session expired. Sign in again.')
      }
    }
    return context
  }
})

server.listen().then(({ url }) => {
  console.log(`? Server ready at ${url}`)
})
```

#### 將 schema 分類: Domain Separation

在 GraphQL Schema Definition 中，有個 keyword `extend` 可以讓不同檔案的 Schema 結合在一起，比如今天將 user 相關的 type 、 query 與 mutation 分到了 `schema/users.js` 裡，但 query 與 mutation 已經定義過了怎麼辦？這邊只要在定義時加上 `extend` 如下，就能夠補充原先的 type 又不會導致定義衝突喔！

```
extend type Query {
  ...
}

extend type Mutation {
  ...
}
```

1. 新增 `schema/user.js` 並將 `schema/index.js` 中 user 部分搬過去

```js
// schema/user.js
const { gql, ForbiddenError, AuthenticationError } = require('apollo-server')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  """
  使用者
  """
  type User { ... }

  extend type Query {
    "取得目前使用者"
    me: User
    "取得所有使用者"
    users: [User]
    "依照名字取得特定使用者"
    user(name: String!): User
  }

  input UpdateMyInfoInput {
    name: String
    age: Int
  }

  type Token {
    token: String!
  }

  extend type Mutation {
    updateMyInfo(input: UpdateMyInfoInput!): User
    addFriend(userId: ID!): User
    "註冊。 email 與 passwrod 必填"
    signUp(name: String, email: String!, password: String!): User
    "登入"
    login(email: String!, password: String!): Token
  }
`

// helper functions
const hash = ...;
const createToken = ...;
const isAuthenticated = ...;

// Resolvers
const resolvers = {
  Query: {
    me: isAuthenticated((root, args, { me, userModel }) =>
      userModel.findUserByUserId(me.id)
    ),
    users: (root, args, { userModel }) => userModel.getAllUsers(),
    user: (root, { name }, { userModel }) => userModel.findUserByName(name)
  },
  User: {
    posts: (parent, args, { postModel }) =>
      postModel.filterPostsByUserId(parent.id),
    friends: (parent, args, { userModel }) =>
      userModel.filterUsersByUserIds(parent.friendIds || [])
  },
  Mutation: {
    updateMyInfo: ...,
    addFriend: ...,
    signUp: ...,
    login: ...
  }
}

module.exports = {
  typeDefs,
  resolvers
}
```

2. 新增 `schema/post.js` 並將 `schema/index.js` 中 post 部分搬過去

```js
// schema/post.js
const { gql, ForbiddenError } = require('apollo-server')

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  """
  貼文
  """
  type Post { ... }

  extend type Query {
    "取得所有貼文"
    posts: [Post]
    "依照 id 取得特定貼文"
    post(id: ID!): Post
  }

  input AddPostInput {
    title: String!
    body: String
  }

  extend type Mutation {
    addPost(input: AddPostInput!): Post
    likePost(postId: ID!): Post
    deletePost(postId: ID!): Post
  }
`

const isAuthenticated = ...;

const isPostAuthor = ...;

// Resolvers
const resolvers = {
  Query: {
    posts: ...,
    post: ...
  },
  Post: {
    author: ...,
    likeGivers: ...
  },
  Mutation: {
    addPost: ...,
    likePost: ...,
    deletePost: ...
  }
}

module.exports = {
  typeDefs,
  resolvers
};
```

3. 清空 `schema/index.js` 並引入上述兩份檔案

需注意，因為另外兩份檔案都是 `extend Query` 與 `extend Mutation` ，所以在這邊需要先定義 Query 與 Mutation ，故在 `Mutation` 裡面放一個測試用的 field 。

```
// schema/index.js
const { gql } = require('apollo-server')

const userSchema = require('./user')
const postSchema = require('./post')

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  type Query {
    "測試用 Hello World"
    hello: String
  }

  type Mutation {
    test: Boolean
  }
`

// Resolvers
const resolvers = {
  Query: {
    hello: () => 'world'
  },
  Mutation: {
    test: () => 'test'
  }
}

module.exports = {
  typeDefs: [typeDefs, userSchema.typeDefs, postSchema.typeDefs],
  resolvers: [resolvers, userSchema.resolvers, postSchema.resolvers]
}
```

所以我們的資料夾架構會變成這樣：

- models/
  |** index.js
  |** user.js
  |\_\_ post.js
- schema/
  |** index.js
  |** user.js
  |\_\_ post.js
- index.js
- .env
- package.json
- package-lock.json

---

這樣程式碼重構就完成了！可以準備加入 database 支援了！

PS 原本想要今天一起加入 DB ，但有點高估自己寫文章的速度 XD
明天再來講 db connection.

---

Reference:

- [Using dotenv package to create environment variables](https://medium.com/@thejasonfile/using-dotenv-package-to-create-environment-variables-33da4ac4ea8f)
- [Tutorial: Connecting To SQLite Database Using Node.js ](http://www.sqlitetutorial.net/sqlite-nodejs/connect/)
- [A SQLite Tutorial With NodeJS](https://stackabuse.com/a-sqlite-tutorial-with-node-js/)
- [如何使用 Repository 模式](https://oomusou.io/laravel/repository/)
- [How to structure GraphQL server code](https://blog.apollographql.com/how-to-build-graphql-servers-87587591ded5)
- [Tutorial: How to build a GraphQL server](https://blog.apollographql.com/tutorial-building-a-graphql-server-cddaa023c035)
- [npm - dotenv](https://www.npmjs.com/package/dotenv)
