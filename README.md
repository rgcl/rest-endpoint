***WARNING! Work in progress...***

rest-endpoint
=============

Nano framework for creating REST Endpoints as an ExpressJS 4 middleware.

```javascript

var app = require('express')(),
    rest = require('rest-endpoint');

var store = {
    has : function (id, ctx) { }
    get : function (id, ctx) { },
    query : function (query, ctx) { },
    add : function (item, ctx) { },
    put : function (id, item, ctx) { },
    remove : function (id, ctx) { }
};

app.use('/animals/:id?', rest(store));

```

So, the request is mapped to a particular method in the store:

```
HEAD   /animals/42           -> store.has(42, ctx)
GET    /animals/42           -> store.get(42, ctx)
GET    /animals              -> store.query({}, ctx)
GET    /animals?type=terrain -> store.query({ type : 'terrain' }, ctx)
PUT    /animals/42           -> store.put(42, item)
POST   /animals              -> store.add(item, ctx)
DELETE /animals/42          -> store.remove(42, ctx)
```

## API

### Core

```javascript
var rest = require('rest-endpoint')
```
In this case, ```rest``` is a function that receive a ```store``` object
and return a ExpressJS/connect compliant end middleware.

The returned middleware MUST be used in the ```app.use``` or in the ```router.use```
in this way:

```javascript
app.use('/v0/books/:id?', rest(store))

or

var route = express.Route()
route.use('/books/:id?', rest(store))
app.use('/v0', route);
```

Note that ```:id?``` is required because some REST FULL methods, like GET need the id of
the resource.

### store

A store is a simple object that abstracts of a collection of data. It's agnostic about the
where the data reside (PostgreSQL, MongoDB, etc).

Each method receive an ```ctx``` (context) object that have at least these attributes:
* req : The request
* res : The response object
* params : Shorthand for ```req.params```

And return a simple object (except ```store.has``` that returns a boolean) or a
[promise](https://github.com/petkaantonov/bluebird#what-are-promises-and-why-should-i-use-them) that resolve the value.

#### store.add(item, ctx) -> item
***Summary:***
Add a item to the store. The item may not have their id.

***HTTP Request:***
```POST``` request to ```path``` without id. The item is read from the body.

***HTTP Response:***
```200 OK```. ```Content-Type: text/json```. In the body the item as JSON.

***Parameters:***
* ```object``` item: the item to add.
* ```object``` ctx: The context without extra info.

***Returns:***
If all is ok, returns the item added whith their generated id.

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
var DBH = require('dbh-pg'),
    db = new DBH('postgres://postgres@localhost/mydb'),
    using = require('bluebird').using

store.add = function (item, ctx) {
    return using(db.conn(), function (conn) {
        return conn.insert('animals', item)
    })
}
```
#### store.put(id, item, ctx)
***Summary:***
Replace the existented item with ```id``` with the given item.

***HTTP Request:***
```POST``` request to ```path``` wit ```id```. The item is read from the body.

***HTTP Response:***
```200 OK```. ```Content-Type: text/json```. In the body the new item as JSON.

***Parameters:***
* id : The identifier of the item.
* ```object``` item: the item to add.
* ```object``` ctx: The context without extra info.

***Returns:***
If all is ok, returns the item new item.

##### Example
***memory***
```javascript
var data = [{name: 'cat', id: 0}, {name: 'dog', id: 1}];

store.put = function (id, item, ctx) {
    data[id] = item;
    return item;
}
```
***[DBH-PG](https://github.com/sapienlab/dbh-pg)***
```javascript
var DBH = require('dbh-pg'),
    db = new DBH('postgres://postgres@localhost/mydb'),
    using = require('bluebird').using

store.put = function (id, item, ctx) {
    return using(db.conn(), function (conn) {
        return conn
            .update('animals', item, { id : id })
            .then(BDH.fetchOne('select * from animals where id=$1', [id]))
    })
}
```