const { ApolloServer, gql } = require('apollo-server');
const DataLoader = require('dataloader');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');
const { promisify } = require('util');
db.get = promisify(db.get);
db.all = promisify(db.all);

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
    console.log('store: getAll');
    return this.db.all('SELECT * FROM store');
  }

  findById (id) {
    console.log('store: findById');
    return this.db.get('SELECT * FROM store WHERE id = ?', [id]);
  }
}

class ProductModel {
  constructor (db) {
    this.db = db;
  }

  findById (id) {
    console.log('product: findById');
    return this.db.get('SELECT * FROM product WHERE id = ?', [id]);
  }

  findAllByIds (ids) {
    const sql =
      'SELECT * FROM product WHERE id IN (' +
      ids.map(() => '?').join(',') +
      ')';
    console.log('product: findByIds', sql, ids);
    return this.db.all(sql, ids);
  }

  findAllByStoreId (storeId, price = 0) {
    console.log('product: findAllByStoreId', storeId, price);
    return this.db.all(
      `SELECT p.*
      FROM product p 
      INNER JOIN store s ON s.id = p.store
      WHERE s.id = ? 
        AND price > ?
      `,
      [storeId, price]
    );
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
    products: (store, { price = 0 }, { productModel, dataloaders }) => {
      // return productModel.findAllByStoreId(store.id, price)
      return dataloaders.queryLoader
        .load([
          'SELECT p.id id FROM product p INNER JOIN store s ON s.id = p.store WHERE s.id = ? AND p.price > ?',
          store.id,
          price
        ])
        .then(rows => rows.map(row => dataloaders.product.load(row.id)));
    },
    product: async (_, { id }, { productModel, dataloaders }) => {
      // return productModel.findById(id)
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
        queryLoader: new DataLoader(
          queries =>
            new Promise(resolve => {
              let waitingOn = queries.length;
              const results = [];
              db.parallelize(() => {
                queries.forEach(async (query, index) => {
                  // db.all()
                  try {
                    const result = await db.all(...query);
                    results[index] = result;
                  } catch (error) {
                    results[index] = error;
                  }
                  if (--waitingOn === 0) {
                    resolve(results);
                  }
                });
              });
            }),
          { cache: false }
        ),
        product: new DataLoader(async productIds => {
          const products = await productModel.findAllByIds(productIds);
          return products.sort(
            (a, b) => productIds.indexOf(a.id) - productIds.indexOf(b.id)
          );
        })
      }
    };
  }
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
