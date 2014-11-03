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

**Note:** [Pagination](#pagination), [Filtering](#filtering), [Sorting](#sorting),
[Fields Selection](#fields-selection) and [Counting](#counting) apply to this
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
###Miscellaneous

####Pagination
Pagination appy to ```store.all```.

Typically you do not want to return all items, but only a range for performance reasons.

For this ```page``` and ```per_page``` params in the ```query string``` (if any)
are passing to the ```ctx``` var.

By default page and per_page are setting to 1 and 25 respectively.
You can override this in ```store.defaultPage``` and ```store.defaultPerPage```.

Furthermore, ```ctx.limit``` automatically is setter to ```ctx.per_page```, and
```ctx.offset``` to ```(ctx.page - 1) * ctx.per_page```.

***Examples***

HTTP Request:
```
GET /animals/?page=3
Accept: application/json
```

```store.all``` implementing with memory:
```javascript
var data = [ 
    { id: 0, name: 'Canela', sex: 'f', type: 'cat' },
    { id: 1, name: 'Steve', sex: 'm', type: 'dog' }
]

store.all = function (ctx, filters) {
    return data.slice(ctx.offset, ctx.limit)
}
```

```store.all``` implementing with [DBH-PG][]:
```javascript
store.all = function (ctx, filters) {
    return using(db.conn(), function (conn) {
        conn.fetchAll('select * from animals ' + DBH.sqlLimit(ctx));
    })
}
```

HTTP Response:
```
200 Ok
Content-Type: application/json
Link: <{host+base_path}animals?page=1&per_page=25>; rel="first",
  <{host+base_path}animals?page=2&per_page=25>; rel="prev",
  <{host+base_path}animals?page=4&per_page=25>; rel="next"

[]
```
Notes:
* You can set ```store.useLinkHeaders = false``` to not use [Link Headers](http://tools.ietf.org/html/rfc5988).
* ```{host+base_path}``` is calculated from the request, example ```https://api.example.com/v1/```.
* ```rel="first"``` ever is ```?page=1```

####Filtering
Filtering apply to ```store.all```.

store.all recive ```filters``` as parameter. This is just the ```query string``` as object without
these reserved words: ```page```, ```per_page```, ```sort```, ```embed``` and ```fields```.

You can use the filters as far you need to filter the return data.

***Examples***

HTTP Request:
```
GET /animals/?page=1&type=cat
Accept: application/json
```

```store.all``` implementing with memory
```javascript
var data = [ 
    { id: 0, name: 'Canela', sex: 'f', type: 'cat' },
    { id: 1, name: 'Steve', sex: 'm', type: 'dog' }
]

store.all = function (ctx, filters) {
    // here we accept only 'type' filter
    if (filters.type) {
        data = data.filter(function (item) {
            item.type === filters.type
        })
    }
    // this is for pagination
    return data.slice(ctx.offset, ctx.limit)
}
```

```store.all``` implementing with [DBH-PG][]
```javascript
store.all = function (ctx, filters) {
    return using(db.conn(), function (conn) {
        // here we accept 'type' and 'sex' filters
        var sql = 'select * from animals where true '
        if (filters.type) {
            sql += 'and type=$type '
        }
        if (filters.sex) {
            sql += 'and sex=$sex '
        }
        // this is for pagination
        sql += DBH.sqlLimit(ctx)
        conn.fetchAll(sql, filters);
    })
}
```

HTTP Response:
```
200 Ok
Content-Type: application/json
Link: <{host+base_path}animals?page=1&per_page=25>; rel="first",
  <{host+base_path}animals?page=2&per_page=25>; rel="next"

[
    { "id" : 0, "name" : "Canela", "sex" : "f", "type" : "cat" }
]
```

####Sorting
Sorting apply to ```store.all```.

You can offer sorting capabilities to the store.

For this ```sort``` parameter in the ```query string``` (if any) is passing to the ```ctx``` var.

sort must be compilant with this grammar:
```bnf
sort      ::= <attr-rule> | <attr-rule> "," <sort>
attr-rule ::= <asc> <attribute>
asc       ::= "+" | "-"
```
Examples ```?sort=+type```, ```?sort=+name,-type```, etc.

The ```+``` says that is ascending, ```-``` descending. Each attribute is separed with ",".

The ```ctx.sort``` has an array in that each element is an array where the first element
is a boolean (true for ascending, false for descending) and the second the attribute name.

***Examples***

HTTP Request:
```
GET /animals/?page=1&sort=+name,-type
Accept: application/json
```

```store.all``` implementing with memory
```javascript
var data = [ 
    { id: 0, name: 'Canela', sex: 'f', type: 'cat' },
    { id: 1, name: 'Steve', sex: 'm', type: 'dog' }
]

store.all = function (ctx, filters) {
    // here we only accept one level of sort
    // so, '-type' is ignored.
    if (ctx.sort.length) {
        var attr = ctx.sort[0].attr,
            asc  = ctx.sort[0].asc
        data.sort(function (a, b) {
            return asc ?
                a[attr] < b[attr] : return a[attr] > b[attr]
        })
    }
    // this is for pagination
    return data.slice(ctx.offset, ctx.limit)
}
```

```store.all``` implementing with [DBH-PG][]
```javascript
store.all = function (ctx, filters) {
    return using(db.conn(), function (conn) {
        var sql = 'select * from animals '
        // here we apply multi-level sorting
        sql += DBH.sqlOrderBy(ctx)
        // this is for pagination
        sql += DBH.sqlLimit(ctx)
        conn.fetchAll(sql)
    })
}
```

HTTP Response:
```
200 Ok
Content-Type: application/json
Link: <{host+base_path}animals?page=1&per_page=25&sort=+name,-type>; rel="first",
  <{host+base_path}animals?page=2&per_page=25&sort=+name,-type>; rel="next"

[
    { "id" : 0, "name" : "Canela", "sex" : "f", "type" : "cat" },
    { "id" : 1, "name" : "Steve", "sex" : "m", "type" : "dog" }
]
```

####Counting
Counting apply to ```store.all```.

If you support pagination (highly recommended), sometimes the Api consumer
need to know the total count of items in the store that match the filters (not only the count
of the returned resultset).

You can set ```ctx.totalCount``` var with that value. Then automatically ```Total-Count``` will be
set in the response header.

For performance reasons maybe you support this only if the Api consumer need it, in this case check
if ```ctx.count``` is set to true (by query string ```?count=true```).

***Examples***

HTTP Request:
```
GET /animals?page=1&sort=+name,-type
Accept: application/json
```

```store.all``` implementing with memory
```javascript
var data = [ 
    { id: 0, name: 'Canela', sex: 'f', type: 'cat' },
    { id: 1, name: 'Steve', sex: 'm', type: 'dog' }
]

store.all = function (ctx, filters) {
    // here we set the total count
    if(ctx.count)
        ctx.totalCount = data.length
    // this is for pagination
    return data.slice(ctx.offset, ctx.limit)
}
```

```store.all``` implementing with [DBH-PG][]
```javascript
store.all = function (ctx, filters) {
    return using(db.conn(), function (conn) {
        return conn
            .fetchAll('select * from animals ' + DBH.sqlLimit(ctx))
            .then(function (items) {
                if (ctx.count) {
                    this.count('animals')
                        .then(function (total) {
                            ctx.totalCount = total
                            return items
                        })
                } else {
                    return items
                }
            })
        }
    })
}
```

```store.all``` implementing with [DBH-PG][] using two connections
```javascript
store.all = function (ctx, filters) {
    return using(db.conn(), db.conn(), function (conn1, conn2) {
        // Here asynchronously we use two connections
        // one for fetch the items and another for counting
        var promises = {}
        promises.items = conn1.fetchAll('select * from animals ' + DBH.sqlLimit(ctx))
        if (ctx.count) {
            promises.total = conn2.count('animals')
        }
        return Promise.props(promises)
            .then(function (results) {
                if(results.total)
                    ctx.totalCount = total
                return results.items
            })
    })
}
```

HTTP Response:
```
200 Ok
Content-Type: application/json
Total-Count: 2
Link: <{host+base_path}animals?page=1&per_page=25&sort=+name,-type>; rel="first",
  <{host+base_path}animals?page=2&per_page=25&sort=+name,-type>; rel="next"

[
    { "id" : 0, "name" : "Canela", "sex" : "f", "type" : "cat" },
    { "id" : 1, "name" : "Steve", "sex" : "m", "type" : "dog" }
]
```

####Fields Selection
Apply to ```store.all``` and ```store.get```.

```ctx.fields``` is setter to array with the value in the query string
``?fields={comma separated list}```. If you support this then must return only the fields
listing in ```ctx.fields```.

***Examples***

HTTP Request:
```
GET /animals/1?&fields=name,type
Accept: application/json
```

```store.all``` implementing with memory
```javascript
var data = [ 
    { id: 0, name: 'Canela', sex: 'f', type: 'cat' },
    { id: 1, name: 'Steve', sex: 'm', type: 'dog' }
]

store.get = function (ctx, id) {
    if(!ctx.fields.length) {
        return data[id]
    }
    if(!data[id]) {
        return null
    }
    // Here we select the fields
    var selected = {}
    ctx.fields.forEach(function (field) {
        selected[field] = data[id][field]
    })
    return selected
}
```

```store.all``` implementing with [DBH-PG][]
```javascript
store.all = function (ctx, filters) {
    return using(db.conn(), function (conn) {
        return conn
            .fetchAll('select * from animals ' + DBH.sqlLimit(ctx))
            .then(function (items) {
                if (ctx.count) {
                    this.count('animals')
                        .then(function (total) {
                            ctx.totalCount = total
                            return items
                        })
                } else {
                    return items
                }
            })
        }
    })
}
```

```store.all``` implementing with [DBH-PG][] using two connections
```javascript
store.all = function (ctx, filters) {
    return using(db.conn(), db.conn(), function (conn1, conn2) {
        // Here asynchronously we use two connections
        // one for fetch the items and another for counting
        var promises = {}
        promises.items = conn1.fetchAll('select * from animals ' + DBH.sqlLimit(ctx))
        if (ctx.count) {
            promises.total = conn2.count('animals')
        }
        return Promise.props(promises)
            .then(function (results) {
                if(results.total)
                    ctx.totalCount = total
                return results.items
            })
    })
}
```

HTTP Response:
```
200 Ok
Content-Type: application/json
Total-Count: 2
Link: <{host+base_path}animals?page=1&per_page=25&sort=+name,-type>; rel="first",
  <{host+base_path}animals?page=2&per_page=25&sort=+name,-type>; rel="next"

[
    { "id" : 0, "name" : "Canela", "sex" : "f", "type" : "cat" },
    { "id" : 1, "name" : "Steve", "sex" : "m", "type" : "dog" }
]
```

####Embedding

####Enveloping

## LICENSE

MIT LICENSE. See LICENSE file.

[DBH-PG]: https://github.com/sapienlab/dbh-pg