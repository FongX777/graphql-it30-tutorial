const { ApolloServer, gql } = require('apollo-server');
const DataLoader = require('dataloader');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');
const { promisify } = require('util');
db.get = promisify(db.get);
db.all = promisify(db.all);
let a;

// run in serial
db.serialize(function () {
  db.run(`
    CREATE TABLE store (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );`);

  const sqlInsertStore = 'INSERT INTO store (name) VALUES (?)';
  db.run(sqlInsertStore, ['store_1']);
  db.run(sqlInsertStore, ['store_2']);

  db.run(`
    CREATE TABLE product (
      id INTEGER PRIMARY KEY,
      store INTEGER,
      name TEXT NOT NULL,
      price INTEGER CHECK(price >= 0),
      FOREIGN KEY (store) REFERENCES store(id)
    );`);

  const sqlInsertProduct =
    'INSERT INTO product (store, name, price) VALUES (?, ?, ?)';
  db.run(sqlInsertProduct, [1, 'store1_p1', 10000]);
  db.run(sqlInsertProduct, [1, 'store1_p2', 500]);
  db.run(sqlInsertProduct, [1, 'store1_p3', 3001]);
  db.run(sqlInsertProduct, [2, 'store2_p1', 50]);
  db.run(sqlInsertProduct, [2, 'store2_p2', 5000]);
});

class StoreModel {
  constructor (db) {
    this.db = db;
  }

  getAll () {
    const sql = 'SELECT * FROM store';
    console.log('storeModel: getAll', sql);
    return this.db.all(sql);
  }

  findById (id) {
    const sql = 'SELECT * FROM store WHERE id = ?';
    console.log('storeModel: findById', sql, id);
    return this.db.get(sql, [id]);
  }
}

class ProductModel {
  constructor (db) {
    this.db = db;
  }

  findById (id) {
    const sql = 'SELECT * FROM product WHERE id = ?';
    console.log('productModel: findById', sql, id);
    return this.db.get(sql, [id]);
  }

  findAllByIds (ids) {
    const sql =
      'SELECT * FROM product WHERE id IN (' +
      ids.map(() => '?').join(',') +
      ')';
    console.log('productModel: findByIds', sql, ids);
    return this.db.all(sql, ids);
  }

  findAllByStoreId (storeId, price = 0) {
    const sql = `SELECT p.*
      FROM product p 
      INNER JOIN store s ON s.id = p.store
      WHERE s.id = ? 
        AND price > ?
      `;
    console.log('productModel: findAllByStoreId', storeId, price);
    return this.db.all(sql, [storeId, price]);
  }
}

const typeDefs = gql`
  type Query {
    stores: [Store]
    store(id: ID): Store
  }
  type Store {
    id: ID
    name: String
    products(
      """
      price bottom line
      """
      price: Int
    ): [Product]
    products_dl(
      """
      price bottom line
      """
      price: Int
    ): [Product]
    product(id: ID!): Product
    productsByIds(ids: [ID!]!): [Product]
  }
  type Product {
    id: ID
    name: String
    price: Int
  }
`;

const resolvers = {
  Query: {
    stores: (_, __, { storeModel }) => {
      return storeModel.getAll();
    },
    store: (_, { id }, { storeModel }) => {
      return storeModel.findById(id);
    }
  },
  Store: {
    products_dl: (store, { price = 0 }, { productModel, dataloaders }) => {
      // return productModel.findAllByStoreId(store.id, price)
      return dataloaders.product.load({ storeId: store.id });
    },
    products: (store, { price = 0 }, { productModel }) => {
      return productModel.findAllByStoreId(store.id);
    },
    product: async (_, { id }, { productModel, dataloaders }) => {
      const product = await dataloaders.product.load(id);
      return product;
    },
    productsByIds: (store, { ids }, { productModel }) => {
      return productModel.findAllByIds(ids.map(id => Number(id)));
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  tracing: true,
  context: async ({ req }) => {
    const storeModel = new StoreModel(db);
    const productModel = new ProductModel(db);
    return {
      storeModel,
      productModel,
      dataloaders: {
        product: new DataLoader(
          async keys => {
            const results = await Promise.all(
              // keys are automatically JSON.parsed
              keys.map(({ storeId, price }) =>
                productModel.findAllByStoreId(storeId, price)
              )
            );
            return results;
          },
          {
            cacheKeyFn: ({ storeId, price }) => {
              return JSON.stringify({
                storeId,
                price
              });
            }
          }
        )
      }
    };
  }
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
