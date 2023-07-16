const historyGen = require('./history.js');
const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;
const path = require('path');

const allowCrossDomain = (req, res, next) => {
    res.header(`Access-Control-Allow-Origin`, `*`);
    res.header(`Access-Control-Allow-Methods`, `GET,PUT,POST,DELETE`);
    res.header(`Access-Control-Allow-Headers`, `Content-Type`);
    next();
};

app.use(allowCrossDomain);
app.use(express.static('app'))

app.get('/history', function(req, res) {
    const events = historyGen.generateHT(historyGen.currentHistory(), (e) => { return e.location.x + ","+e.location.y });
    const json = JSON.stringify(events);
    res.send(json);
});

app.get('/step', (req, res) => {
    historyGen.simulate(10);
    res.send();
});


app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});