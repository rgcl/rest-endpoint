// load methods
[
    'head',
    'get',
    'post',
    'put',
    'patch',
    'delete'
].forEach(function (method) {
    exports[method.toUpperCase()] = require('./methods/' + method);
});