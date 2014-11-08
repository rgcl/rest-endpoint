
var data = [{"casa":"324","otro":"df","id":0},{"casa":"3232","otro":"23 sdfsdf","id":1},{"casa":"3232","otro":"23 sdfsdf","id":2},{"casa":"3232","otro":"23 sdfsdf","id":3},{"casa":"3232","otro":"23 sdfsdf","id":4},{"casa":"3232","otro":"343","id":5}];

module.exports = {
    
    get : function (ctx, id) {
        return data[id];
    },
    
    all : function (ctx, filters) {
        console.log(ctx);
        return data
            .filter(function (item) { return !!item; })
            .slice(ctx.offset, ctx.offset + ctx.limit);
    },
    
    add : function (ctx, item) {
        var id = data.length;
        data[id] = item;
        item.id = id;
        return item;
    },
    
    put : function (ctx, id, item) {
        item.id = id;
        data[id] = item;
        return item;
    },
    
    del : function (ctx, id) {
        delete data[id];
    },
    
    has : function (ctx, id) {
        return id in data;
    }
    
};