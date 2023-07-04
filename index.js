const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const ejs = require('ejs');
const moment = require('moment');
const fs = require('fs');
let cookieParser = require('cookie-parser');

/////////////////////Database/////////////////////
const db_ac = require('./database/model.js');
/////////////////////Database/////////////////////

/////////////////////Functions/////////////////////
function log(text, type) {
    let msg = `[${moment().format('DD/MM/YYYY HH:mm:ss')}] ${text}`;
    console.log(msg);
    if (!fs.existsSync('log')) {
        fs.mkdirSync('log');
    }
    if (type == 'general') {
        fs.appendFile('log/general.log', msg + '\n', function(err) {
            if (err) throw err;
        });
    } else if (type == 'error') {
        fs.appendFile('log/error.log', msg + '\n', function(err) {
            if (err) throw err;
        });
    } else if (type == 'access') {
        fs.appendFile('log/access.log', msg + '\n', function(err) {
            if (err) throw err;
        });
    }
}
/////////////////////Functions/////////////////////

/////////////////////Middleware/////////////////////
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', 'www');
/////////////////////Middleware/////////////////////

/////////////////////Access Log/////////////////////
app.use(function(req, res, next) {
    let ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    log(`${ip} ${req.method} ${req.url} ${req.httpVersion} ${req.headers['user-agent']} ${req.headers['accept-language']} ${req.headers['accept-encoding']}`, 'access');
    next();
});
/////////////////////Access Log/////////////////////

require('./www/routes')(app, db_ac);

/////////////////////Error Log/////////////////////
app.use(function(req, res, next) {
    res.status(404).json({code: 404, message: 'Sayfa bulunamadı.'});
});

app.use(function(err, req, res, next) {
    res.status(500).json({code: 500, message: 'Bir hata oluştu.'});
    log(err, 'error');
});

app.use(async function(req, res, next) {
    if (req.cookies.userID || req.cookies.password) {
        let ac = await db_ac.findOne({_id: req.cookies.userID});
        if (ac) {
            next();
        } else {
            res.clearCookie('userID');
            res.clearCookie('password');
            res.clearCookie('username');
            next();
        }
    }
    next();
});

/////////////////////Error Log/////////////////////

/////////////////////Port/////////////////////
app.listen(80, function() {
    log(`Sunucu başlatıldı.`, 'general');
});
/////////////////////Port/////////////////////