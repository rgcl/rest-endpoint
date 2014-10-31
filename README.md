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

app.use('/animals/id?', rest(store));

```

So, the request is mapped to a particular method in the store:

```
HEAD   /animals/34           -> store.has(34, ctx)
GET    /animals/34           -> store.get(43, ctx)
GET    /animals              -> store.query({}, ctx)
GET    /animals?type=terrain -> store.query({ type : 'terrain' }, ctx)
PUT    /animals/43           -> store.put(43, { say: 'mau', name: 'cat' })
POST   /animals              -> store.add(item, ctx)
DELETE / animals/34          -> store.remove(34, ctx)
```

## API

```javascript
var rest = require('rest-endpoint')
```
is a middleware that recive a ```store``` object.

### store

A store is a simple object that have methods for ...
