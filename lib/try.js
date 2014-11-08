
module.exports = function (object, method, args, callback, errback) {
    try {
        var result = object[method].apply(object, args) || null;
        if (result !== null && typeof result.then === 'function') {
            result.then(callback, errback);
        } else {
            callback(result);
        }
    } catch(err) {
        errback(err);
    }
}