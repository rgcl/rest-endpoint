var util = require('util');

function makeError(name, _message, _statusCode) {
    
    function CustomError(message, statusCode) {
        if (!(this instanceof CustomError)) {
            throw new Error(
                CustomError.name
                + ' is a constructor and need the \'new\' operator.'
            );
        }
        this.message = message || _message;
        this.statusCode = statusCode || _statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
    
    CustomError.prototype.name = name;
    
    util.inherits(CustomError, Error);
    
    return CustomError;
}

exports.ServerError = makeError('ServerError', 'Server Error', 500);
exports.ClientError = makeError('ClientError', 'Client Error', 400);
exports.HttpNotFound = makeError('HttpNotFound', 'The item not exists', 404);
exports.HttpNotAllowed = makeError('HttpMethodNotAllowed', 'The method is not allowed', 405);
exports.HttpUnauthorized = makeError('HttpUnauthorized', 'You need credentials', 401);
exports.HttpForbidden = makeError('HttpForbidden', 'Forbidden', 403);
exports.HttpConflict = makeError('HttpConflict', 'conflict', 409);

exports.HttpNotImplemented = makeError('HttpNotImplemented', 'Called a method not implemented', 501);

exports.handler = function (res) {
	return function (err) {
		if (err.statusCode) {
			res.status(err.statusCode);
			res.json({
				code : err.statusCode,
				message : err.massage
			});
		} else {
			console.error(err.stack);
			res.status(500);
			res.json({
				code : 500,
				message : 'Server Error'
			});
		}
	}
}
