
var errors = require('../errors'),
    attempt = require('../try'),
    getMethod = require('./get');


module.exports = function (store, ctx, req, res, next) {
    var id = ctx.params.id;
    if (id && store.put) {
        attempt(store, 'put', [ctx, id, req.body], function (resp) {
            res.json(resp);
        }, errors.handler(res));
    } else {
        errors.handler(res)(new errors.HttpNotImplemented);
    }
}