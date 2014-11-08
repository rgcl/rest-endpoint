
var errors = require('../errors'),
    attempt = require('../try'),
    getMethod = require('./get');


module.exports = function (store, ctx, req, res, next) {
    if (store.add) {
        attempt(store, 'add', [ctx, req.body], function (resp) {
            res.json(resp);
        }, errors.handler(res));
    } else {
        errors.handler(res)(new errors.HttpNotImplemented);
    }
}