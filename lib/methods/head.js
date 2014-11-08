
var errors = require('../errors'),
    attempt = require('../try'),
    getMethod = require('./get');


module.exports = function (store, ctx, req, res, next) {
    var id = ctx.params.id;
    if (id) {
        if (store.has) {
            attempt(store, 'has', [ctx, id], function (resp) {
                res.status(resp ? 200 : 404);
                res.end();
            }, errors.handler(res));
        } else {
            // if store.get is not found, then tries to call store.get
            getMethod(store, ctx, req, res, next);
        }
    } else {
        errors.handler(res)(new errors.HttpNotImplemented);
    }
}