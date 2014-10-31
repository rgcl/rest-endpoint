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
* params : Shorthand for req.params

And return a simple object (except ```store.has``` that returns a boolean) or a
[promise](https://github.com/petkaantonov/bluebird#what-are-promises-and-why-should-i-use-them) that resolve the value.

#### store.add

Add a 


