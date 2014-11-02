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

### Store

A store (called also *resource*) is a simple object that abstracts a collection of items. It's agnostic about
where the data reside (PostgreSQL, MongoDB, etc).

Each method receive a ```ctx``` (*context*) as first parameter,
that is an object that have at least these attributes:
* ```req``` : The ```request``` from ExpressJS/Connect
* ```res``` : The ```response``` from ExpressJS/Connect
* ```params``` : Shorthand for ```req.params```. So if the target is ```/:user_id/photos/:id?```
                 you have ```{ user_id: {user_id}, id: {id} }```
Some methods have additional parameters that are documented in those methods.

Each store methods returns a simple object (except ```store.has``` that returns a boolean) or a
[promise](https://github.com/petkaantonov/bluebird#what-are-promises-and-why-should-i-use-them) that resolve to value.

### Mapping

#### GET /{resource}/
Mapped to ```store.all(ctx, filters)```

store.all must return an array of items. If no items then empty array.

**Note:** [Pagination](#Pagination), [Filtering](#Filtering), [Sorting](#Sorting),
[Fields Selection](#Fields_Selection) and [Total-Count](#Total-Count) apply to this
method (store.all) buts are omited here for simplicity.

***Examples***

HTTP Request:
```
GET /animals/
Accept: application/json
```

```store.all``` implemented in memory:
```javascript
var data = [
    { id: 0, name: 'Canela', sex: 'f', type: 'cat' },
    { id: 1, name: 'Milo', sex: 'm', type: 'dog' }
]

store.all = function (ctx, filters) {
    return data
}
```

```store.all``` implemented with [DBH-PG][]:
```javascript
store.all = function (ctx, filters) {
    return using(db.conn(), function (conn) {
        return conn
            .fetchAll('select * from animals')
    })
}
```

HTTP Response:
```
200 OK
Content-Type: application/json

[
    { "id" : 0, "name" : "Canela", "sex" : "f", "type" : "cat" },
    { "id" : 1, "name" : "Steve", "sex" : "m", "type" : "dog" }
]
```

HTTP Response without data:
```
200 OK
Content-Type: application/json

[]
```

#### GET /{resource}/{id}
Mapped to ```store.get(ctx, {id})```

store.get must return the item object or null (or undefined) if the item not exists.

**Note:** [Fields Selection](#Fields_Selection) apply to this
method (store.get) buts is omited here for simplicity.

***Examples***

HTTP Request:
```
GET /animals/1
Accept: application/json
```

```store.get``` implemented in memory:
```javascript
var data = [
    { id: 0, name: 'Canela', sex: 'f', type: 'cat' },
    { id: 1, name: 'Steve', sex: 'm', type: 'dog' }
]

store.get = function (ctx, id) {
    return data[id]
}
```

```store.get``` implemented with [DBH-PG][]:
```javascript
store.get = function (ctx, id) {
    return using(db.conn(), function (conn) {
        return conn
            .fetchOne('select * from animals where id=$1', [id])
    })
}
```

HTTP Response:
```
200 OK
Content-Type: application/json

{ "id" : 1, "name" : "Steve", "sex" : "m", "type" : "dog" }
```

HTTP Response without data:
```
404 Not Found
Content-Type: application/json

{ "code" : 404, "message": "Not Found" }
```

#### POST /{resource}/
Mapped to ```store.add(ctx, item)```

store.add must return the item added (with the id setted if is autogenerated). If there
are problems just throws an Error.

***Examples***

HTTP Request type form:
```
POST /animals/
Content-Type: application/x-www-form-urlencoded
Accept: application/json

name=turtle&sex=m
```

HTTP Request type json:
```
POST /animals/
Content-Type: application/json
Accept: application/json

{ "name" : "Gupin", "sex" : "m", "type" : "pinguin" }
```

```store.add``` implemented in memory:
```javascript
var data = [
    { id: 0, name: 'Canela', sex: 'f', type: 'cat' },
    { id: 1, name: 'Steve', sex: 'm', type: 'dog' }
]

store.add = function (ctx, item) {
    var id = data.length
    item.id = id
    data[id] = item
    return item
}
```

```store.get``` implemented with [DBH-PG][]:
```javascript
store.add = function (ctx, item) {
    return using(db.conn(), function (conn) {
        return conn
            .insert('animals', item, ['name', 'sex', 'type'])
    })
}
```

HTTP Response:
```
201 Created
Content-Type: application/json

{ "id" : 3, "name" : "Gupin", "sex" : "m", "type" : "pinguin" }
```

#### PUT /{resource}/{id}
Mapped to ```store.put(ctx, id, item)```

store.put update the entire item by the given id. Of course, you can consider
only certain fields. The id in the HTTP request body (if any) is ignored.
If there are problems just throws an Error.

***Examples***

HTTP Request type form:
```
PUT /animals/3
Content-Type: application/x-www-form-urlencoded
Accept: application/json

name=Fasamu&sex=m&type=lion
```

HTTP Request type json:
```
PUT /animals/3
Content-Type: application/json
Accept: application/json

{ "name" : "Fasamu", "sex" : "m", "type" : "lion" }
```

```store.put``` implemented in memory:
```javascript
var data = [
    { id: 0, name: 'Canela', sex: 'f', type : 'cat' },
    { id: 1, name: 'Steve', sex: 'm', type : 'dog' },
    { id: 3, name: 'Gupin', sex: 'm', type : 'pinguin' }
]

store.put = function (ctx, id, item) {
    id = parseInt(id, 10)
    if(id === NaN) {
        // the errors are automatic captured by the module
        throw new Error('This particular store accepts only integers ids')
    }
    item.id = id
    data[id] = item
    return item
}
```

```store.put``` implemented with [DBH-PG][]:
```javascript
store.put = function (ctx, id, item) {
    return using(db.conn(), function (conn) {
        return conn
            .update('animals', item, { id : id })
            .then(BDH.fetchOne('select * from animals where id=$1', [id]))
    })
}
```

HTTP Response:
```
200 OK
Content-Type: application/json

{ "id" : 3, "name" : "Fasamu", "sex" : "m", "type" : "lion" }
```

#### DELETE /{resource}/{id}
Mapped to ```store.del(ctx, id)```

store.del remove the item by the given id from the store.
If there are problems just throws an Error.

***Examples***

HTTP Request:
```
DELETE /animals/3
```

```store.delete``` implemented in memory:
```javascript
var data = [
    { id: 0, name: 'Canela', sex: 'f', type : 'cat' },
    { id: 1, name: 'Steve', sex: 'm', type : 'dog' },
    { id: 3, name: 'Gupin', sex: 'm', type : 'pinguin' }
]

store.delete = function (ctx, id) {
    delete data[id]
}
```

```store.delete``` implemented with [DBH-PG][]:
```javascript
store.delete = function (ctx, id) {
    return using(db.conn(), function (conn) {
        return conn
            .delete('animals', { id : id })
    })
}
```

HTTP Response:
```
204 No Content
```

####PATCH /{resource}/{id}
Mapped to ```store.upd(ctx, id)```

store.upd (*update*) is alias to store.put. You can override this for accept
partial updates and leave store.put for entire updates.
If there are problems just throws an Error.

####HEAD /{resource}/{id}
Mapped to ```store.has(ctx, id)```

store.has is alias to store.get, but not content body is given. You can override this
for performance reasons.

In case of override, this method expects an boolean. True if the item exists, false elsewhere.

***Examples***

HTTP Request:
```
HEAD /animals/1
Accept: application/json
```

```store.get``` implemented in memory:
```javascript
var data = [
    { id: 0, name: 'Canela', sex: 'f', type: 'cat' },
    { id: 1, name: 'Steve', sex: 'm', type: 'dog' }
]

store.get = function (ctx, id) {
    return id in data
}
```

```store.get``` implemented with [DBH-PG][]:
```javascript
store.get = function (ctx, id) {
    return using(db.conn(), function (conn) {
        return conn
            .exists('animals', { id : id })
    })
}
```

HTTP Response if exists:
```
200 OK
Content-Type: application/json
```

HTTP Response if not exists:
```
404 Not Found
Content-Type: application/json
```

###Pagination

###Filtering

###Sorting

###Fields Selection

###Total-Count

## LICENSE

MIT LICENSE. See LICENSE file.

[DBH-PG]: https://github.com/sapienlab/dbh-pg