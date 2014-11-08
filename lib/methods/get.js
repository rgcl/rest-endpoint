
var errors = require('../errors'),
    attempt = require('../try');
    
var miscSupported = {
    page : 1,
    per_page : 1,
    limit : 1,
    offset : 1,
    sort: 1,
    fields : 1,
    embed : 1,
    count : 1
};

module.exports = function (store, ctx, req, res, next) {
    var id = ctx.params.id,
        query = req.query;

    if (query.fields) {
        ctx.fields = query.fields.split(',');
    } else {
        ctx.fields = [];
    }

    if (id) {
        if (store.get) {
            attempt(store, 'get', [ctx, id], function (resp) {
                if (!resp) {
                    res.status(404);
                }
                if (req.method === 'HEAD') {
                    res.end();
                } else {
                    res.json(resp);
                }
            }, errors.handler(res));
        } else {
            errors.handler(res)(new errors.HttpNotImplemented);
        }
    } else if (store.all) {

        // counting
        ctx.count = query.count === 'true'
            || query.count === '1';

        sorting(ctx, query, store);

        paging(ctx, query, store);

        var filters = filtering(ctx, query, store);

        attempt(store, 'all', [ctx, filters], function (resp) {
            if (ctx.totalCount) {
                res.set('Total-Count', ctx.totalCount);
            }
            if (req.method === 'HEAD') {
                res.end();
            } else {
                res.json(resp || []);
            }
        }, errors.handler(res));

    } else {
        errors.handler(res)(new errors.HttpNotImplemented);
    }
}

/**
 * ctx.sort = parse(query.sort)
 */
function sorting(ctx, query, store) {
    ctx.sort = [];
    if (!query.sort) {
        return;
    }

    query.sort
        .split(',')
        .forEach(function (sortRule) {
            ctx.sort.push({
                attr : sortRule.slice(1),
                asc : sortRule.charAt(0) !== '-'
            });
        })
}

/**
 * return query - miscSupported
 */
function filtering(ctx, query, store) {
    var filters = {};
    for (var key in query) {
        if (key in miscSupported) {
            filters[key] = query[key];
        }
    }
    return filters;
}

/**
 * set the ctx.limit, ctx.offset, ctx.page
 * and ctx.per_page from the query info.
 */
function paging(ctx, query, store) {

    if (query.limit) {
        ctx.limit = query.limit;
        ctx.per_page = ctx.limit;
    } else if (query.per_page) {
        ctx.per_page = query.per_page;
        ctx.limit = ctx.per_page;
    } else {
        ctx.per_page = store.limit || 25;
        ctx.limit = ctx.per_page;
    }

    if (query.offset) {
        ctx.offset = query.offset;
        ctx.page = (query.offset + 1) * ctx.per_page;
    } else if (query.page) {
        ctx.page = query.page;
        ctx.offset = (ctx.page -1 ) * ctx.per_page;
    } else {
        ctx.page = store.page || 1;
        ctx.offset = ctx.page -1;
    }

}