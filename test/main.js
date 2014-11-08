
var express = require('express'),
    bodyParser = require('body-parser'),
    rest = require('../main'),
    testResource = require('./memory-store');
    
var app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.send('<a href="/v0/resource">all</a>')
})

app.use('/v0/resource/:id?', rest(testResource));

var server = app.listen(3000, function () {
  var host = server.address().address,
    port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
})