const express = require('express');
const session = require('express-session');
const MongoDBSession = require('connect-mongodb-session')(session);
const mongoose = require('mongoose');
const app = express();
const mongoURI = 'mongodb://localhost:27017/sessions';
const UserModel = require('./models/users');
const port = process.env.PORT;
const node_secret = process.env.NODE_SESSION_SECRET;
const mongo_secret = process.env.MONGODB_SESSION_SECRET;
require('dotenv').config();

mongoose.connect(mongoURI, {
    useNewUrlParser: true, 
    useCreateIndex: true,
    useUnifieedTopology: true
}).then(res => {
    console.log("MongoDB Connected.");
})

const store = new MongoDBSession({
    uri: mongoURI,
    collection: "MySessions"
});

app.set("view engine", "ejs");
app.use(express.urlencoded({extended: true}));



app.use(session({
    secret: NODE_SESSION_SECRET,
    saveUninitialized: false, 
    resave: false,
    store: store
}));

app.get('/', (req, res) => {
    res.send("Landing Page!");
});

app.get('/login', (req, res) =>{
    app.render("login");
});

app.post('/login', (req, res) => {});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/register", (req, res) => {
    const {username, email, password} = req.body;
    // let user = await UserModel.findOne({email});
    if (user) {
        return res.redirect('/signup');
    }
});

app.get("/members", (req, res) => {
    res.render("members");
})

app.get('/logout', (req,res) => {
    req.session.destroy();
    res.redirect("login");
})

app.get('*', (req, res) => {
    res.status(404);
    res.send("404 Error, Page Not Found!");
});

app.listen(port, console.log(`Server running on port ${port}`));