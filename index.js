require('./utils.js');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const Joi = require('joi');
require('dotenv').config();
const saltRounds = 12;

const app = express();
const port = process.env.PORT || 3000;
const node_session_secret = process.env.NODE_SESSION_SECRET;

const expireTime = 24 * 60 * 60 * 1000;

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

var {database} = include('/databaseConnection');
const userCollection = database.db(mongodb_database).collection('users');
app.use(express.urlencoded({extended: false}));

var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
        secret: mongodb_session_secret
    }
})

app.use(session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false, 
    resave: true
}));

app.get('/', (req, res) => {
    if (req.session.authenticated) {
        var username = req.session.username;
        res.send(`<h2>Hello, ${username}.</h2>
        <a href='/members'><button>Members</button></a>
        <a href='/logout'><button>Logout</button></a>`);
    } else {
        res.send("<a href='/login'><button>Login</button></a><a href='/signup'><button>Sign Up</button></a>");
    }
});

app.get('/nosql-injection', async (req, res) => {
    var username = req.query.user;

    if (!username) {
        res.send('error');
        return;
    }
    const schema = Joi.string().max(20).required();
    const validationResult = schema.validate(username);
    if (validationResult.error != null) {
        console.log(validationResult.error);
        res.send('NoSQL Injection Detected!');
        return;
    }
    const result = await userCollection.find({username: username}).project({username: 1, password: 1, _id: 1}).toArray();
    console.log(result);
    res.send(`Hello ${username}!`);
})

app.get('/login', (req, res) => {
    res.send(`Log in 
    <form action='/submitUser' method='post'>
        <input name='username' type='text' placeholder='username'>
        <input name='password' type='password' placeholder='password'>
        <button>submit</button>
    </form>
    <a href='/signup'><button>Sign Up</button></a>
    `);
});

app.post('/submitUser', async (req, res) => {
    var username = req.body.username;
    var password = req.body.password;

    const schema = Joi.string().max(20).required();
    const validationResult = schema.validate(username);
    if (validationResult.error != null) {
        console.log(validationResult.error);
        res.redirect('/login');
    }

    const result = await userCollection.find({username: username}).project({username: 1, password: 1, _id: 1}).toArray();
    console.log(result);

    if (result.length != 1) {
        console.log("User not found.");
        res.redirect('/login');
        return;
    }

    if (await bcrypt.compare(password, result[0].password)) {
        console.log("correct password");
        req.session.authenticated = true;
        req.session.username = username;
        req.session.cookie.maxAge = expireTime;
        res.redirect('/');
        return;
    } else {
        console.log("Incorrect password");
        res.redirect('/login');
        return;
    }
});

app.get("/signup", (req, res) => {
    res.send(`Sign Up 
    <form action='/createUser' method='post'>
    <input name='username' type='text' placeholder='username'>
    <input name='email' type='email' placeholder='email'>
    <input name='password' type='password' placeholder='password'>
    <button>Sign Up</button>
    </form>`);
});

app.post('/createUser', async (req, res) => {
    var username = req.body.username;
    var password = req.body.password;

    const schema = Joi.object({
        username: Joi.string().alphanum().max(20).required(),
        password: Joi.string().max(20).required()
    });

    const validationResult = schema.validate({username, password});
    if (validationResult.error != null) {
        console.log(validationResult.error);
        res.redirect('/signup');
    }

    var hashedPassword = await bcrypt.hash(password, saltRounds);
    await userCollection.insertOne({username: username, password: hashedPassword});
    console.log("Inserted User");

    res.send(`Created User</br>
    <a href='/login'><button>Login</button></a>
    `);
});

app.get("/members", (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/login');
    }
    var num = Math.floor(Math.random() * 3);
    var pic;
    switch(num) {
        case 0:
            pic = 'animal0';
            break;
        case 1:
            pic = 'animal1';
            break;
        case 2:
            pic = 'animal2';
            break;
    }
    var username = req.session.username;
    res.send(`<h2>Hello, ${username}.</h2>
    </br>
    <h3>Your animal is:</h3>
    <img src="/${pic}.png" alt="animal pic">
    </br>
    <a href='/logout'><button>Logout</button></a>`);
});

app.get('/logout', (req,res) => {
    req.session.destroy();
    res.redirect("/");
});

app.use(express.static(__dirname + '/public'));

app.get('*', (req, res) => {
    res.status(404);
    res.send('Page not found 404'); 
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
