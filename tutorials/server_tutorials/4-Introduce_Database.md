# 打造一個 GraphQL API Server 應用：部落格社交軟體 - 4 (加入 database)

![header](https://ithelp.ithome.com.tw/upload/images/20181016/20111997WWqgh86nkr.png)

今天要來教大家如何加入 datbase ，雖然其實經過昨天重構後突然發現好像不是很有必要介紹這一章節 XD 因為只要把 Model 中的 function 替換成 db operation 就可以了～～

因為要從頭開始把 db 放進去有點太花時間，所以我今天只大概做個簡單介紹怎麼開頭，有興趣的朋友可以自己嘗試看看～

---

GraphQL 的一個特點就是不限定一定要使用哪個 database ，很多人一開始都會誤會以為 GraphQL 是一個完整的 Server API Project ，但其實

> GraphQL 只是一層薄薄的 API Interface

如同 Apollo 這篇 [Tutorial: How to build a GraphQL server](https://blog.apollographql.com/tutorial-building-a-graphql-server-cddaa023c035) 的資料取得方式就包括 MongoDB, sqlite 與 RESTful API ，可以見 GraphQL 是多麽彈性！

## Sqlite 安裝

sqlite 就是一個專為測試而生的 db! 因為不像其他 db 還需要另起 server ，我可以直接透過主要程式碼直接啟動一個 database ，省去管理的麻煩，不然每次都還要 `docker run` 真的很麻煩！

sqlite 在 nodeJS 安裝很簡單，僅需輸入：

```bash
npm install --save sqlite3
```

然後
可以看一下以下簡易的啟動程式碼：

```js
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');

db.serialize(function() {
  db.run('CREATE TABLE lorem (info TEXT)');

  var stmt = db.prepare('INSERT INTO lorem VALUES (?)');
  for (var i = 0; i < 10; i++) {
    stmt.run('Ipsum ' + i);
  }
  stmt.finalize();

  db.each('SELECT rowid AS id, info FROM lorem', function(err, row) {
    console.log(row.id + ': ' + row.info);
  });
});

db.close();
```

可以看到一個 sqlite 就這麼簡單執行起來！

以下簡單介紹一下 sqlite 主要的幾支 API：

- `new sqlite3.Database(filename, [mode], [callback])`
  連接到 sqlite 資料庫，這裡的 filename 如果使用 `:memory:` 就會使用記憶體當資料庫，所以每次重啟就是空的資料。
- run: 可用來 Create 或 Insert 資料
- get: select 用途，不過只會回傳第一筆
- all: select 用途，不過只會回傳全部

關於如何有組織的使用 sqlite ，可以直接使用 [sequelize](https://www.npmjs.com/package/sequelize) 或是參考這一篇 [A SQLite Tutorial with Node.js](https://stackabuse.com/a-sqlite-tutorial-with-node-js/) 都有很詳盡的介紹 !

另外效能方面可以參考 [data loader](https://www.apollographql.com/docs/graphql-tools/connectors.html#dataloader-per-request) ，因為 GraphQL 每層 fieldResolver 都有可能觸發 db operation ，如果今天一次索取大量資料，且其中很多 field 都有 db operation 就會產生非常可觀的時間成本！而 dataloader 幫你管理了一些快取機制，讓你不必在多次訪問 db !

---

今天大概介紹到這邊～而前面入門部分也告一個段落，之後會多多介紹一些比較常用的技巧或 Design Pattern ，明天見囉～
