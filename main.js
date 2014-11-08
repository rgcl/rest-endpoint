'use strict';

var methods = require('./lib/methods');    

module.exports = function rest(resource) {

    if (!resource.defautPage) {
        resource.defaultPage = 1;
    }

    if (!resource.defaultPerPage) {
        resource.defaultPerPage = 25;
    }

    return function (req, res, next) {

        var ctx = Object.create(resource.ctx || null);
        ctx.req = req;
        ctx.res = res;
        ctx.params = req.params;

        var id = req.params.id;

        var method = methods[req.method];
        if (method) {
            method(resource, ctx, req, res, next);
        } else {
            console.log('error');
        }
        
    }
    
};