let sha256 = require('sha256');
let moment = require('moment');
const fs = require('fs');
module.exports = function(app, db_ac) {

    /////////////////Functions/////////////////////
    async function is_logged_in(req, res, next) {
        if (!req.cookies.userID || !req.cookies.password) return res.redirect('/?error=true&message=Oturum açmadınız.');
        let ac = await db_ac.findOne({_id: req.cookies.userID});
        if (!ac) {
            res.clearCookie('userID');
            res.clearCookie('password');
            res.clearCookie('username');
            return res.redirect('/?error=true&message=Oturum açmadınız.');
        }
        if (ac.password != req.cookies.password) {
            res.clearCookie('userID');
            res.clearCookie('password');
            res.clearCookie('username');
            return res.redirect('/?error=true&message=Oturum açmadınız.');
        }
        next();
    }

    function log(text, type) {
        let msg = `[${moment().format('DD/MM/YYYY HH:mm:ss')}] ${text}`;
        console.log(msg);
        if (!fs.existsSync('./log')) {
            fs.mkdirSync('./log');
        }
        if (type == 'general') {
            fs.appendFile('./log/general.log', msg + '\n', function(err) {
                if (err) throw err;
            });
        } else if (type == 'error') {
            fs.appendFile('./log/error.log', msg + '\n', function(err) {
                if (err) throw err;
            });
        } else if (type == 'access') {
            fs.appendFile('./log/access.log', msg + '\n', function(err) {
                if (err) throw err;
            });
        } else if (type == 'profile') {
            fs.appendFile('./log/profile.log', msg + '\n', function(err) {
                if (err) throw err;
            });
        }
    }

    /////////////////Functions/////////////////////
    app.get('/', function(req, res) {
        res.render('index.ejs');
    });

    app.get('/login', function(req, res) {
        if (req.cookies.password && req.cookies.username) return res.redirect('/@' + req.cookies.username);
        res.render('login.ejs');
    });

    app.get('/register', function(req, res) {
        if (req.cookies.password && req.cookies.username) return res.redirect('/@' + req.cookies.username);
        res.render('register.ejs');
    });

    app.post('/signin', async function(req, res) {
        let {
            email,
            password
        } = req.body;
        if (!email || !password) return res.redirect('/?error=true&message=Mail veya şifre girilmedi.');
        let user = await db_ac.findOne({email: email});
        if (!user) return res.redirect('/?error=true&message=Kullanıcı bulunamadı.');
        if (user.password != sha256(password)) return res.redirect('/?error=true&message=Şifre yanlış.');
        res.cookie('userID', user._id, { maxAge: 900000, httpOnly: true });
        res.cookie('username', user.username, { maxAge: 900000, httpOnly: true });
        res.cookie('password', user.password, { maxAge: 900000, httpOnly: true });
        res.redirect('/@' + user.username);
    });

    app.post('/signup', async function(req, res) {
        let {
            username,
            email,
            password
        } = req.body;
        if (!username || !email || !password) return res.redirect('/?error=true&message=Kullanıcı adı, mail veya şifre girilmedi.');
        let user = await db_ac.findOne({username: username});
        if (user) return res.redirect('/?error=true&message=Kullanıcı adı kullanılıyor.');
        user = await db_ac.findOne({ email: email });
        if (user) return res.redirect('/?error=true&message=Mail kullanılıyor.');
        let newUser = new db_ac({
            username: username,
            password: sha256(password),
            email: email,
            social_media: [],
        });
        newUser.save();
        res.cookie('userID', newUser._id, { maxAge: 900000, httpOnly: true });
        res.cookie('username', newUser.username, { maxAge: 900000, httpOnly: true });
        res.cookie('password', newUser.password, { maxAge: 900000, httpOnly: true });
        res.redirect('/@' + username);
    });

    app.get('/@:username', async function(req, res) {
        let username = req.params.username;
        if (!username) return res.redirect('/?error=true&message=Kullanıcı adı girilmedi.');
        let user = await db_ac.findOne({username: username});
        if (!user) return res.redirect('/?error=true&message=Kullanıcı bulunamadı.');
        let social_media = [];
        for (let i = 0; i < user.social_media.length; i++) {
            let u = user.social_media[i];
            let social = {
                name: u.name,
                link: u.link,
                icon: u.icon,
                _id: u._id,
            };
            social_media.push(social);
        }
        let u_profile = req.cookies?.username == username ? true : false;
        log(`@${username} profile page opened. Session: ${req.cookies?.username}, IP: ${req.ip}`, 'profile');
        res.render('profile.ejs', {
            user: user,
            social_media,
            u_profile
        });
    });

    app.get('/edit', is_logged_in, async function(req, res) {
        let user = await db_ac.findOne({_id: req.cookies.userID});
        if (!user) return res.redirect('/?error=true&message=Kullanıcı bulunamadı.');
        let social_media = [];
        for (let i = 0; i < user.social_media.length; i++) {
            let u = user.social_media[i];
            let social = {
                name: u.name,
                link: u.link,
                icon: u.icon,
                _id: u._id
            };
            social_media.push(social);
        }
        log(`@${user.username} edit page opened. Session: ${req.cookies?.username}, IP: ${req.ip}`, 'profile');
        res.render('edit.ejs', {
            user: user,
            social_media
        });
    });

    app.post('/edit', is_logged_in, async function(req, res) {
        let user = await db_ac.findOne({_id: req.cookies.userID});
        if (!user) return res.redirect('/?error=true&message=Kullanıcı bulunamadı.');
        let {
            about,
            name,
            surname,
            email,
            photo,
            country
        } = req.body;
        if (!about || !name || !surname || !email || !photo || !country) return res.redirect('/edit?error=true&message=Boş alan bırakmayınız.');
        user.about = about;
        user.name = name;
        user.surname = surname;
        user.email = email;
        user.profile_picture = photo;
        user.country = country;
        await user.save();
        res.redirect('/@' + user.username);
    });

    app.get('/add-social', is_logged_in, async function(req, res) {
        let user = await db_ac.findOne({_id: req.cookies.userID});
        if (!user) return res.redirect('/?error=true&message=Kullanıcı bulunamadı.');
        let {
            platform,
            link,
            username
        } = req.query;
        if (!platform || !link || !username) return res.redirect('/edit?error=true&message=Boş alan bırakmayınız.');
        let social = {
            name: username,
            link: link,
            icon: platform,
        };
        user.social_media.push(social);
        await user.save();
        res.redirect(`/@${user.username}`);
    });

    app.get('/delete-social', is_logged_in, async function(req, res) {
        let user = await db_ac.findOne({_id: req.cookies.userID});
        if (!user) return res.redirect('/?error=true&message=Kullanıcı bulunamadı.');
        let {
            id
        } = req.query;
        if (!id) return res.redirect('/edit?error=true&message=Boş alan bırakmayınız.');
        if(id.length != 24) return res.redirect('/edit?error=true&message=Geçersiz ID.');
        await db_ac.updateOne({_id: req.cookies.userID}, {$pull: {social_media: {_id: id}}});
        res.redirect(`/@${user.username}`);
    });

    app.get('/logout', function(req, res) {
        res.clearCookie('userID');
        res.clearCookie('password');
        res.clearCookie('username');
        res.redirect('/');
    });
};