'use strict';

function distpatch(req, res) {
    return function (result) {
        res.set('Content-Type', 'text/json');
        if (!!result) {
            try {
                res.end(JSON.stringify(result));
            } catch(e) {
                // TODO
                res.status(404);
                res.end('null');
            }
        } else {
            res.status(404);
            res.end('null');
        }
    }
}
    
function errorHandler(req, res) {
    return function (err) {
        res.end(JSON.stringify({
            error: err.code,
            message : err.message
        }));
    }
}

function when(promise, callback, errback) {
    if (promise.done) {
        promise.done(callback, errback);
    } else {
        if (promise instanceof Error) {
            errback(promise);
        } else {
            callback(promise);
        }
    }
}

module.exports = function (store) {

    return function (req, res, next) {

        var ctx = {
            req : req,
            res : res,
            params : req.params
        };

        switch(req.method) {
            
            case 'HEAD':
                if (store.has) {
                    when(
                        store.has(req.params.id, ctx),
                        distpatch(),
                        errorHandler(req, res)
                    );
                } else {
                    errorHandler(req, res)(
                        new Error('Not supported')
                    )
                }
                break;

            case 'GET':
                var id = req.params.id;
                if (id !== undefined && id !== null) {
                    // calling get
                    when(
                        store.get(id, ctx),
                        distpatch(req, res),
                        errorHandler(req, res)
                    );
                } else {
                    // calling query
                    var query = req.query,
                        range = [],
                        rangeHeader,
                        orderBy;
                    if (query.limit) {
                        range[1] = query.offset || 0;
                        range[2] = query.limit || 25;
                    } else {
                        rangeHeader = req.get('Range')
                        if (rangeHeader) {
                            range = rangeHeader.match(/items=([0-9]+)-([0-9]+)/)
                                || [null, 0, 25] // todo throw 400 err
                        } else {
                            range[1] = 0;
                            range[2] = 25;
                        }
                    }
                    orderBy = [];
                    if (req.query.orderBy) {
                        req.query
                        .orderBy
                        .split(',')
                        .forEach(function (item) {
                            orderBy.push({
                                attr : item.slice(1),
                                desc : item[0] === '-'
                            });
                        });
                    }
                    
                    ctx.start = range[1];
                    ctx.count = range[2];
                    ctx.orderBy = orderBy;
                    crx.total = false;
                    
                    when(
                        store.query(query, ctx),
                        function (items) {
                            if (ctx.total) {
                                var range2 = result.total > range[2] ?
                                    range[2] : result.total;
                                res.set(
                                    'Content-Range',
                                    'items '
                                        + range[1]
                                        + '-'
                                        + range2
                                        + '/'
                                        + result.totalCount
                                );
                                res.set('X-Total-Count', result.totalCount);
                            }
                            distpatch(req, res)(items)
                        },
                        errorHandler(req, res)
                    );
                }
                break;
            
            case 'POST':
                
                break;
            
            case 'PUT':
                
                break;
            
            case 'DELETE':
                
                break;
            
            default:
                next();
        }
        
    }
    
};