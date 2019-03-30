# 打造一個 GraphQL API Server 應用：部落格社交軟體 - 2 (Authentication & Authorization)

在前面一篇講解完基本的功能後，就來講一項 API Server 常見的功能： Authentication & Authorization 。

通常登入功能的實作分為 Session-based 與 Token-based 兩種 (詳細優點可見[這篇問答](https://stackoverflow.com/questions/40200413/sessions-vs-token-based-authentication))，而對於一個簡單的服務而言， Token-based 相對而言簡單、安全且效能較佳，因此這邊我們選用 Token-based 的認證方式 (若想學習 Session-based 的朋友可參考[這篇](https://github.com/apollographql/apollo-server/blob/master/docs/source/best-practices/authentication.md) 使用 passport.js)。

那就讓我們開始 Token-based 的旅程吧 !

---

## 1. Token-based Authentication

若還有不熟悉 Token-based Authentication 的朋友可參考以下這張超棒的解說圖：

![token-based authentication](https://cdn-images-1.medium.com/max/800/1*PDry-Wb8JRquwnikIbJOJQ.png)
圖片來源: https://medium.com/@sherryhsu/session-vs-token-based-authentication-11a6c5ac45e4

可以看到圖中是使用 JWT 作為 Token 生產工具，且整套流程主要就是藉由

1. Client 帶著帳號密碼向 Server 發出 login request 。
2. Server 收到帳號密碼後，確認無誤後用搭配該使用者的資料 (user info) 產生一個 JWT Token 回傳給 Client。
3. Client 得到 Token 後，以後只要送出 request 時在 header 帶入此 token 。
4. Server 收到並解析 Token 成功後就知道是哪位使用者發出的 request 並讓指令繼續進行或是因權限阻止繼續執行。

## 2. 套件安裝 - bcrypt + jsonWebToken

在 JS 中，登入系統認證通常會用到兩個大名鼎鼎的 package ，分別為 [bcrypt](https://www.npmjs.com/package/bcrypt) 與 [jsonWebToken](https://www.npmjs.com/package/jsonwebtoken) (jwt)，前者可幫助我們加密密碼並做密碼比對，後者則是允許我們傳入自訂的資料  來生產認證用的 Token 。

題外話插播，今天的教學以簡單快速為主，使用的加密方式安全性並不是十分受保障，若是有興趣可參考這篇 [Password and Credential Management in 2018](https://medium.com/@harwoeck/password-and-credential-management-in-2018-56f43669d588) ，或參考 [How Dropbox securely stores your passwords](https://blogs.dropbox.com/tech/2016/09/how-dropbox-securely-stores-your-passwords/)

至於如何安裝這兩項套件就請各位輸入

```bash
$ npm install --save bcrypt jsonwebtoken
```

簡單介紹一下兩個套件我們主要需要的 function:

- bcrypt
  - `bcrypt.hash(text, saltRounds)`
    - text (String) 放你要加密的字串
    - saltRounds (Int) 會幫你把加密的字串弄得更難破解，數值越高代表越難破解也越花時間
  - `bcrypt.compare(text, hashedText)`
    - text (String) 放你要認證的字串 (未加密)，通常登入時是 Client 傳來的密碼
    - hashedText (String) 放已加密字串，通常是 Server 從 Database 拿出來的資料
- jsonwebtoken
  - `jwt.sign(payload, secret, options)`
    - payload (Object) 放你自定義的資料供未來解析後使用，通常為使用者資訊
    - secret (String) 為一段只能給 Server 知道的驗證碼
    - options (Object) 讓你規定一些行為，通常會放 `expiresIn` 為 token 設置期限，本次範例使用 `1d` 代表一天期限。其他參數可自行去[文件](https://www.npmjs.com/package/jsonwebtoken) 研究
  - `jwt.verify(token, secret)`
    - token (String) 就是由上面 sign 出來的 token ，通常是當 Client 發 request 到 Server 時會在 header 帶上 token
    - secret (String) 基本上跟當初簽署出來的 token 用同一個 secret 就 ok 了

如果有人還是搞不清楚到底是誰加密誰變 token ，我用一小段話作小結： bcrypt 幫你的 password 加密，讓別人就算從 database 偷到加密後的 password 也沒辦法登入 ; jwt 幫你把使用者用帳密登入得到的資訊弄成一串稱為 token 的亂碼，Server 檢查 token 沒問題就可以得知是誰已經登入以及誰在做操作。

講了這麼多先備知識，讓我們開始將以上方法和工具應用到 GraphQL 中吧 !

## 3. Authentication: Register (註冊) & Login (登入)

### 3-1. Register

接下來我們來做 Register ! 這樣就可以建立自己的帳號囉 ~ Register 的要做的事很簡單，取得 name, email, password 後創造一個新的 User ，而既然是關乎建造，那就是在 Mutation 的範疇內。

#### Register - Schema

一樣先在 Schema 的 Mutation Type 定義

```
type Mutation {
  "註冊。 email 與 passwrod 必填"
  signUp(name: String, email: String!, password: String!): User
}
```

再來是 Resolver

#### Register - Resolver

```js
// 引入外部套件
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 定義 bcrypt 加密所需 saltRounds 次數
const SALT_ROUNDS = 2;
// 定義 jwt 所需 secret (可隨便打)
const SECRET = 'just_a_random_secret';

...

// helper functions
...
const hash = text => bcrypt.hash(text, SALT_ROUNDS);

const addUser = ({ name, email, password }) => (
  users[users.length] = {
    id: users[users.length - 1].id + 1,
    name,
    email,
    password
  }
);

const resolver = {
  ...,
  Mutation: {
    ...,
    signUp: async (root, { name, email, password }, context) => {
      // 1. 檢查不能有重複註冊 email
      const isUserEmailDuplicate = users.some(user => user.email === email);
      if (isUserEmailDuplicate) throw new Error('User Email Duplicate');

      // 2. 將 passwrod 加密再存進去。非常重要 !!
      const hashedPassword = await hash(password, SALT_ROUNDS);
      // 3. 建立新 user
      return addUser({ name, email, password: hashedPassword });
    },
  }
}
```

#### Register - Demo

來試試看吧 ! 使用 mutation `signup` 看看 ~

![https://imgur.com/5HECkFB](https://i.imgur.com/5HECkFB.png)

再來試試 query `users` 或 `user(name)` 來看是否真的成功建立新 user !

![https://imgur.com/auOQRaA](https://i.imgur.com/auOQRaA.png)

### 3-2. Login

有了 register 後，讓我們來看看如何使用新增的使用者登入 !

#### Login - Schema

先看 Schema 部分，我們先定義一個新的 Object Type `Token` ，Mutaiton Type 裡需要新增 `login` field 並回傳 `Token` Object Type ，其實這邊要不要新增一個 Object Type 見仁見智，有些人可以直接讓 `login` 回傳 String 或是實作新的 Scalar Type ，不過為了簡單與做出區別故選擇新增 Object Type 。

```
type Token {
  token: String!
}

type Mutation {
  ...
  "登入"
  login (email: String!, password: String!): Token
}
```

#### Login - Resolver

這裡我們在 token 建造時加上 `expiredIn: 'id'` 的參數表示 token 在一天後過期，到時候使用者要進行操作時就需要再次登入。

```js
// helper function
const createToken = ({ id, email, name }) => jwt.sign({ id, email, name }, SECRET, {
  expiresIn: '1d'
});

const resolvers = {
  Mutation: {
    ...
    login: async (root, { email, password }, context) => {
      // 1. 透過 email 找到相對應的 user
      const user = users.find(user => user.email === email);
      if (!user) throw new Error('Email Account Not Exists');

      // 2. 將傳進來的 password 與資料庫存的 user.password 做比對
      const passwordIsValid = await bcrypt.compare(password, user.password);
      if (!passwordIsValid) throw new Error('Wrong Password');

      // 3. 成功則回傳 token
      return { token: await createToken(user) };
    }
  }
}
```

其實回傳 token 這件事情也可以在 Register 時就回傳，讓會員一註冊就可以登入，這邊主要是看你的 sepc 設計。

#### Login - Demo

首先使用註冊再使用登入，如下圖。

![https://imgur.com/38GZwy5](https://i.imgur.com/38GZwy5.png)

OK 有了登入成功的 token 後就來看如何讓 query 解析 token 以得知誰發出的 request 。

### 3-3. Context 參戰 !

今天就讓我們把煩人的 `meId` 拿掉！

前天說過，要如何確保使用者已經登入使用？答案就在 Field Resolver 的第三個參數 `context` 中 !

而 context 的初始化過程其實就是一個 middleware ，在以前大多都是裝一個 middleware 來解析送來的 request 裡面 header 的 token ，不過有了 Apollo Server 2 後就直接在 Server 初始化時加入定義。

#### Context Setup

讓我們來看一個 request 進來時需要做什麼解析

1. 如果有的話將 token 從 request header 的 `x-token` 取出 (`x-token` 只是一個好懂的命名，可自行定義)
2. 用 jwt 檢查該 token 是否合法 (有無錯誤或過期) ，失敗的話 throw Error
3. 檢查成功並將從中獲得的資訊 (通常為使用者資訊) 回傳
4. 上一步回傳的資料會成為 `context` 的內容，供之後執行的 query 或 mutation 使用

```js
new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    // 1. 取出
    const token = req.headers['x-token'];
    if (token) {
      try {
        // 2. 檢查 token + 取得解析出的資料
        const me = await jwt.verify(token, SECRET);
        // 3. 放進 context
        return { me };
      } catch (e) {
        throw new Error('Your session expired. Sign in again.');
      }
    }
    // 如果沒有 token 就回傳空的 context 出去
    return {};
  }
});
```

當 `context` 有了登入者的資料，讓我們看看如何修改原先的 Resovlers 。

#### Context - 修改 Resolver

首先讓我們來修改 `Query.me` 。

```js
const resolvers = {
  Query: {
    me: (root, args, { me }) => {
      if (!me) throw new Error ('Plz Log In First');
      return findUserByUserId(me.id)
    },
    ...
  }
}
```

修改完後我們到 GraphQL Playground 試試看！但**要記得在送出 Query 前要先在左下角的 HTTP HEADER 加上從 `login` 得到的 token**

```json
{
  "x-token": "eyJh......."
}
```

如圖。

![https://imgur.com/A30Ol7Y](https://i.imgur.com/A30Ol7Y.png)

接著讓我們順著修改 mutation 裡面的 resolver (其實就只是第一檢查 `me` 第二將 `meId` 替換成 `me.id`)

```js
const resolvers = {
  ...
  Mutation: {
    updateMyInfo: (parent, { input }, { me }) => {
      if (!me) throw new Error ('Plz Log In First');
      // 過濾空值
      const data = ["name", "age"].reduce(
        (obj, key) => (input[key] ? { ...obj, [key]: input[key] } : obj),
        {}
      );

      return updateUserInfo(me.id, data);
    },
    addFriend: (parent, { userId }, { me: { id: meId } }) => {
      if (!me) throw new Error ('Plz Log In First');
      const me = findUserByUserId(meId);
      if (me.friendIds.include(userId))
        throw new Error(`User ${userId} Already Friend.`);

      const friend = findUserByUserId(userId);
      const newMe = updateUserInfo(meId, {
        friendIds: me.friendIds.concat(userId)
      });
      updateUserInfo(userId, { friendIds: friend.friendIds.concat(meId) });

      return newMe;
    },
    addPost: (parent, { input }, { me }) => {
      if (!me) throw new Error ('Plz Log In First');
      const { title, body } = input;
      return addPost({ authorId: me.id, title, body });
    },
    likePost: (parent, { postId }, { me }) => {
      if (!me) throw new Error ('Plz Log In First');

      const post = findPostByPostId(postId);

      if (!post) throw new Error(`Post ${postId} Not Exists`);

      if (!post.likeGiverIds.includes(postId)) {
        return updatePost(postId, {
          likeGiverIds: post.likeGiverIds.concat(me.id)
        });
      }
      return updatePost(postId, {
        likeGiverIds: post.likeGiverIds.filter(id => id === me.id)
      });
    },
    ...
  }
};
```

就完成囉 !

### 3-4. Authentication Demo 囉

在登入後輸入 mutation 來測試：

```
mutation ($updateMeInput: UpdateMyInfoInput!, $addPostInput:AddPostInput!) {
  updateMyInfo(input: $updateMeInput) {
    id
    name
    age
  }
  addPost(input: $addPostInput) {
    id
    title
    body
    author {
      name
    }
    createdAt
  }
  likePost(postId: 1) {
    id
  }
}

---
VARIABLES
{
  "updateMeInput": {
    "name": "NewTestMan",
    "age": 28
  },
  "addPostInput": {
    "title": "Test ~ Hello World",
    "body": "testttttinggggg"
  }
}
---
HTTP HEADERS
{
  "x-token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIiwibmFtZSI6IlRlc3RNYW4iLCJpYXQiOjE1NDA1MzgzMjksImV4cCI6MTU0MDYyNDcyOX0.ElEoRylTjjB_ACZnayABYlRDGvQSx_yQT4D7XixegFg"
}
```

結果如下圖。
![img](https://i.imgur.com/BTIYtNK.png)

## 4. Authorization 與 Error

有了認證系統後，就讓我們來介紹 Authorization （授權)!

什麼是 Authroization ? 它跟 Authentication 差別在哪裡 ? 簡單來說， Authentication 處理的是登入問題，如果登入失敗那就是 Authentication 「認證」的問題 ; Authoriaction 處理的是權限問題，如果登入者或 guest 要進行一項不屬於他權限允許的操作，那就會引發 Authorizaion 「授權」問題。

所以如果沒有帶 token 或 token 錯誤就是 Authorization Error ，但不是每一個 query/mutation 都會需要 token ，而需要 token 來取得使用者身份 (`me`) 的每個 query/mutation 在 Resovler 層面都要重複一段重複的 `if (!me)` 檢查。

### 4-1. 檢查有無認證 isAuthenticated ?

因此我們可以將這一段抽出來，並搭配 Apollo Server 提供的 Error : `ForbiddenErrorError` ，如下：

```js
const { ApolloServer, gql, ForbiddenError } = require('apollo-server');

const isAuthenticated = resolverFunc => (parent, args, context) => {
  if (!context.me) throw new ForbiddenError('Not logged in.');
  return resolverFunc.apply(null, [parent, args, context]);
};

const reoslver = {
  Query: {
    ...,
    me: isAuthenticated((parent, args, { me }) => findUserByUserId(me.id)),
  },
  Mutation: {
    updateMyInfo: isAuthenticated((parent, { input }, { me }) => {
      ...
    }),
    addFriend: isAuthenticated((parent, { userId }, { me: { id: meId } }) => {
      ...
    }),
    addPost: isAuthenticated((parent, { input }, { me }) => {
      ...
    }),
    likePost: isAuthenticated((parent, { postId }, { me }) => {
      ...
    }),
    ...
  }
};
```

是不是感覺清爽與易讀許多 ! 當然還有很多不同的實作方式或是使用一些 helper function 讓檢查 function 可以一直串接起來，可參考 [graphql-resolvers](https://www.npmjs.com/package/graphql-resolvers) 。

#### isAuthenticated Demo

可以直接在 GraphQL Playground 輸入

```
query {
  me {
    id
  }
}
```

如果出現如下圖中的效果就代表成功囉～

![https://imgur.com/InjNY2N](https://i.imgur.com/InjNY2N.png)

### 4-2. 檢查是否作者 isPostAuthor ?

為了 demo 這項功能，讓我們在 Schema 的 Mutation Type 新增一個 field: `deletePost` ~ 也就是刪貼文動作。

#### deletePost Schema

```
type Mutation {
  ...
  deletePost(postId: ID!): Post
}
```

#### deletePost Resolver + isPostAuthor

而這邊 Resolver 就要實作 `deletePost` ，並且檢查使用者若非該貼文作者就不能刪文。

```js
// helper functions
const deletePost = (postId) =>
  posts.splice(posts.findIndex(post => post.id === postId), 1)[0];


const isPostAuthor = resolverFunc => (parent, args, context) => {
  const { postId } = args;
  const { me } = context;
  const isAuthor = findPostByPostId(postId).authorId === me.id;
  if (!isAuthor) throw new ForbiddenError('Only Author Can Delete this Post');
  return resolverFunc.applyFunc(parent, args, context);
}

const resolvers = {
  ...,
  Mutation: {
    ...,
    deletePost: isAuthenticated(
      isPostAuthor((root, { postId }, { me }) => deletePost(postId))
    ),
  }
}
```

#### isPostAuthor DEMO

OK ! 這邊試試看用能不能以登入狀態但是刪除別人的文章，如果出現下圖就算成功！

![https://imgur.com/QGKmtpT](https://i.imgur.com/QGKmtpT.png)

DONE!!

除了以上的方法，Apollo 其實就比較推薦資料取得的 function 都包在 Model 裡面，像 `findUserByUserId`, `updateUserInfo` 等等就包進 `UserModel` 中，而 Authorization 部分就做在 UserModel 裡，如此一來可以隱藏更多實作細節甚至減少程式碼。

或是有些人會用 GraphQL Directives 來做 Authorization ，透過在 Schema 放上 `@authenticated` 之類的標籤來達到更易讀的目的。

Authorization 講到這邊告一個段落，之後會有再 po 文章做更深入的介紹，包含 Role-based Authorization (身份權限)。

---

今天的介紹到這邊，至此也已經有一個 API Server 的架勢了 ! 但似乎又缺少了些什麼的感覺...
啊！就是少了真正的 database 所以總感覺不太正式。

OK ! 那明天就讓我們來看看如何接上 DB 吧 !

同樣整份 code 也可以直接上我的 CodeSandbox 看喔 ~~
[![Edit Apollo Server - Social Network App](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/mz0zpx31zj)

---

Reference:

- [Apollo Medium - Authorization in GraphQL ](https://blog.apollographql.com/authorization-in-graphql-452b1c402a9)
- [Apollo - Access control](https://www.apollographql.com/docs/guides/access-control.html)
- [GraphQL Apollo Server Tutorial](https://www.robinwieruch.de/graphql-apollo-server-tutorial/#apollo-server-authorization)
- [Apollo Server - Error handling](https://www.apollographql.com/docs/apollo-server/features/errors.html)

另外想知道更多 Authentication 比較可以參考

- [Session vs Token Based Authentication](https://medium.com/@sherryhsu/session-vs-token-based-authentication-11a6c5ac45e4)
- [Cookies vs. Tokens: The Definitive Guide](https://dzone.com/articles/cookies-vs-tokens-the-definitive-guide)
