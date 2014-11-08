
var errors = require('../errors'),
    attempt = require('../try'),
    getMethod = require('./get');


module.exports = function (store, ctx, req, res, next) {
    var id = ctx.params.id;
    if (id && store.del) {
        attempt(store, 'del', [ctx, id], function (resp) {
            res.json(resp);
            res.end();
        }, errors.handler(res));
    } else {
        errors.handler(res)(new errors.HttpNotImplemented);
    }
}