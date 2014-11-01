***WARNING! Work in progress...***

rest-endpoint
=============

ExpressJS/Connect middleware to encapsulate the request to RESTful logic style.

```javascript

var app = require('express')(),
    rest = require('rest-endpoint');

var store = {
    has : function (ctx, id) { },
    get : function (ctx, id) { },
    all : function (ctx, filters) { },
    add : function (ctx, item) { },
    put : function (ctx, id, item) { },
    upd : function (ctx, id, item) { },
    del : function (ctx, id) { }
    // These attributes can be overridden
    // , idAttr : 'id'
    // , ctx : {}
};

app.use('/animals/:id?', rest(store));

```

So, the request is mapped to a particular method in the store:

```
HEAD   /animals/42               -> store.has(ctx, 42)
GET    /animals/42               -> store.get(ctx, 42)
GET    /animals                  -> store.all(ctx, {})
GET    /animals?type=herbivorous -> store.all(ctx, { type: 'herbivorous' })
POST   /animals                  -> store.add(ctx, item)
PUT    /animals/42               -> store.put(ctx, 42, item)
PATCH  /animals/42               -> store.put(ctx, 42, item)
DELETE /animals/42               -> store.del(ctx, 42)
```

## API

### Core

```javascript
var rest = require('rest-endpoint')
```

The main function ```rest``` expects a store object. A store is a plain object
that contains the methods that are mapped by the rest function.

It returns a "end" middleware that must be used in ```app.use``` (or ```router.use```). Example:

```javascript
app.use('/v0/books/:id?', rest(store))
```

or

```javascript
var route = express.Route()
route.use('/books/:id?', rest(store))
app.use('/v0', route);
```

Note that ```:id?``` is required because some RESTful methods, like GET need the id of
item to work.

### store

A store (called also **resource**) is a simple object that abstracts a collection of items. It's agnostic about
where the data reside (PostgreSQL, MongoDB, etc).

Each method receive a ```ctx``` (**context**) as first parameter,
that is an object that have at least these attributes:
* ```req``` : The ```request``` from ExpressJS/Connect
* ```res``` : The ```response``` from ExpressJS/Connect
* ```params``` : Shorthand for ```req.params```. So if the target is ```/:user_id/photos/:id?```
                 you have ```{ user_id: <the_given_user_id>, id: <the_given_id> }```
Some methods have additional parameters that are documented in those methods.

Each store methods returns a simple object (except ```store.has``` that returns a boolean) or a
[promise](https://github.com/petkaantonov/bluebird#what-are-promises-and-why-should-i-use-them) that resolve to value.

### Mapping

#### GET /<resource>/<id>
Mapped to ```store.get(ctx, <id>)```

store.get must return the item object or null (or undefined) if the item not exists.

***Examples***

HTTP Request
```
GET /animals/1
Accept: text/json
```

store.get implemented in memory
```javascript
var data = [{name: 'cat', id: 0}, {name: 'dog', id: 1}];

store.has = function (id, item, ctx) {
    return data[id];
}
```

store.get implemented with [DBH-PG][1]

#### store.get(id, ctx)
***Summary:***
Returns the item whose identifier is ```id```

***HTTP Request:***
```HEAD``` request to ```path``` wit ```id```.

***HTTP Response:***  
```200 OK```. In the body the item as JSON.  
```404 Not Found``` if the item not found.

***Parameters:***
* id : The identifier of the item.
* ```object``` ctx: The context without extra info.

***Returns:***
The item object or null (or undefined) if the item does not exists.

##### Example
***memory***

***[DBH-PG](https://github.com/sapienlab/dbh-pg)***
```javascript
store.put = function (id, item, ctx) {
    return using(db.conn(), function (conn) {
        return conn
            .fetchOne('select * from animals where id=$1', [id])
    })
}
```

#### store.add(item, ctx) -> item
***Summary:***
Add a item to the store. The item may not have their id.

***HTTP Request:***
```POST``` request to ```path``` without id. The item is read from the body.

***HTTP Response:***
```200 OK```. In the body the added item as JSON.

***Parameters:***
* ```object``` item: the item to add.
* ```object``` ctx: The context without extra info.

***Returns:***
Returns the item added whith their generated id.

##### Example
***memory***
```javascript
var data = [];

store.add = function (item, ctx) {
    var id = data.length;
    item.id = id;
    data[id] = item;
    return item;
}
```
***[DBH-PG](https://github.com/sapienlab/dbh-pg)***
```javascript
store.add = function (item, ctx) {
    return using(db.conn(), function (conn) {
        return conn
            .insert('animals', item)
    })
}
```
#### store.put(id, item, ctx)
***Summary:***
Replace the existented item with ```id``` with the given item.

***HTTP Request:***
```POST``` request to ```path``` wit ```id```. The item is read from the body.

***HTTP Response:***
```200 OK```. In the body the replacing item as JSON.

***Parameters:***
* id : The identifier of the item.
* ```object``` item: the item to add.
* ```object``` ctx: The context without extra info.

***Returns:***
Returns the replacing item.

##### Example
***memory***
```javascript
var data = [{name: 'cat', id: 0}, {name: 'dog', id: 1}];

store.put = function (id, item, ctx) {
    id = parseInt(id, 10);
    if(id === NaN) {
        // the errors are automatic captured by the module
        throw new Error('This particular store accepts only integers ids');
    }
    item.id = id;
    data[id] = item;
    return item;
}
```
***[DBH-PG](https://github.com/sapienlab/dbh-pg)***
```javascript
store.put = function (id, item, ctx) {
    return using(db.conn(), function (conn) {
        return conn
            .update('animals', item, { id : id })
            .then(BDH.fetchOne('select * from animals where id=$1', [id]))
    })
}
```

#### store.has(id, ctx)
***Summary:***
Is there an item whose identifier is ```id```?

***HTTP Request:***
```HEAD``` request to ```path``` wit ```id```.

***HTTP Response:***
```200 OK```. ```Content-Type: text/json```. In the body the response ```true``` or ```false```.

***Parameters:***
* id : The identifier of the item.
* ```object``` ctx: The context without extra info.

***Returns:***
```true``` if the item exists, false elsewhere.

##### Example
***memory***
```javascript
var data = [{name: 'cat', id: 0}, {name: 'dog', id: 1}];

store.has = function (id, item, ctx) {
    return id in data;
}
```
***[DBH-PG](https://github.com/sapienlab/dbh-pg)***
```javascript
store.put = function (id, item, ctx) {
    return using(db.conn(), function (conn) {
        return conn
            .exists('animals', { id : id })
    })
}
```



#### store.query(query, ctx)
***Summary:***
Execute a query and return an array of items.

***HTTP Request:***
```HEAD``` request to ```path``` with ```id```.
The query string is passed to ```query``` parameter as object.  
And if some of these headers appear:
* ```Range: items={start}-{count}```, then ctx.start and ctx.count is setter.
* ```X-Order-By: +A,-B```, then ctx.sort was setter to [{attr:'A', desc: false}, {attr:'B', desc: true}].

***HTTP Response:***  
```200 OK```. In the body array of items as JSON.  
If ```ctx.total``` is setter, then these headers will be included:
* ```X-Total-Count: {ctx.total}```
* ```Content-Range: {ctx.start}-{ctx.count}/{ctx.total}```

***Parameters:***
* id : The identifier of the item.
* ```object``` ctx: The context without extra info.

***Returns:***
The array of items (if no item, then empty array).

##### Example
***memory***
```javascript
var data = [{name: 'cat', id: 0, color: 'red'}, {name: 'dog', id: 1, color: 'green'}]

store.query = function (query, ctx) {
    ctx.total = data.length
    if(!query.color) {
        return data
    }
    // we support queries for color
    var resulset = []
    data.forEach(function (item) {
        if(item.color === query.color) {
            resulset.push(item)
        }
    });
    return resulset
}
```
***[DBH-PG](https://github.com/sapienlab/dbh-pg)***
```javascript
store.query = function (query, ctx) {
    return using(db.conn(), db.conn(), function (conn1, conn2) {
        var sql = 'select * from animals where true '
        // we support queries for color and/or type
        if(query.color) {
            sql += 'and color=$color '
        }
        if(query.type) {
            sql += 'and type=$type '
        }
        
        // we support sort and limits
        sql += DBH.orderBy(ctx) // ctx.sort
        sql += DBH.limit(ctx) // ctx.start, ctx.count
        
        return Promise.join(
            conn1.fetchOne(sql, query),
            conn2.count('animals')
        ).then(function (items, total) {
            crx.total = total
            return items
        })
    })
}
```

[DBH-PG]: https://github.com/sapienlab/dbh-pg