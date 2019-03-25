var express = require('express')
  , http = require('http')
  , app = express()
  , server = http.createServer(app);

app.get('/', function (req, res) {
  res.render('index.html');
});

server.listen(3000, function() {
  console.log('Express server listening on port ' + server.address().port);
});