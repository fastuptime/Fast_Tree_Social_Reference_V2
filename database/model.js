const mongoose = require('mongoose');
const moment = require('moment');
let db = mongoose.createConnection('mongodb://localhost:27017/test', {useNewUrlParser: true, useUnifiedTopology: true});

let User = new mongoose.Schema({
    username: String,
    name: { type: String, default: 'Bilinmiyor' },
    surname: { type: String, default: '' },
    password: String,
    email: String,
    about: { type: String, default: 'Bu kullanıcı hakkında bir şey yazılmamış.' },
    profile_picture: { type: String, default: 'https://cdn.discordapp.com/embed/avatars/0.png' },
    country: { type: String, default: 'Turkey' },
    social_media: [
        {
            name: String,
            icon: String,
            link: String,
            created: {
                default: { type: String, default: () => moment().format('DD/MM/YYYY HH:mm:ss') }
            },
        }
    ],
    created: {
        type: String,
        default: moment().format('DD/MM/YYYY HH:mm:ss')
    },
    updated: {
        type: String,
        default: moment().format('DD/MM/YYYY HH:mm:ss')
    },
});

let UserModel = db.model('User', User);

User.pre('save', function(next) {
    this.updated = moment().format('DD/MM/YYYY HH:mm:ss');
    next();
});

module.exports = UserModel;