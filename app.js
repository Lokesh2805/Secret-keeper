//jshint esversion:6
require("dotenv").config();
//const bcrypt = require("bcrypt");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportlocalmongoose = require("passport-local-mongoose");
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const _ = require("lodash");
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

//const saltrounds = 10;
app.use(session({
    secret: "my little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://rejeevseth19712:lokesh28@cluster0.pr4o6nx.mongodb.net/userDB").then(()=>{
    console.log("connected to database successfully!!");
});

const userschema= new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userschema.plugin(passportlocalmongoose);
userschema.plugin(findOrCreate);


const User = new mongoose.model("user", userschema); 

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });



passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get("/", function(req, res){
res.render("home");
});

app.get("/auth/google", 
    passport.authenticate("google", { scope: ["profile"]})

);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });



app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
    });


app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}}).then((founduser)=>{
        res.render("secrets", {userwithsecrets: founduser});
    });
    
    });

    app.get("/submit", function(req, res){
        if(req.isAuthenticated()){
            res.render("submit");
        }else{
            res.redirect("/login");
        }
        
        });

    app.post("/submit", function(req, res){

        const submittedsecret = req.body.secret;

        User.findById(req.user.id).then((founduser)=>{
            founduser.secret = submittedsecret;
            founduser.save();
            res.redirect("/secrets");


        });



    });
    
    app.get("/logout", function(req, res){
        req.logout(function(err) {
            if (err) { return next(err); }
            res.redirect('/');
          });
    });



app.post("/register", function(req, res){
    
    // bcrypt.hash(req.body.password, saltrounds).then((hash)=>{
    //     const newuser = User({
    //         email:req.body.username,
    //         password:hash
    //     });
    
    // newuser.save().then(() => {
    //     res.render("secrets");
    //      }).catch((err) => {
    //        console.log(err);
    //      });
    // });
 User.register({username: req.body.username}, req.body.password, function(err, user){

    if(err){
        console.log(err);
        res.redirect("/register");
    }else{
        passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");
        });
    }

 });
    

});


app.post("/login", function(req, res){

    // const username = req.body.username;
    // const password = req.body.password;

    // User.findOne({email: username}).then((founduser)=>{
    //     if(founduser){
    //         bcrypt.compare(password, founduser.password).then((result)=>{
    //                 if(result===true){
    //                     res.render("secrets");
    //                 }
    //         }); 
    //     }
    // });


    const user = new User({
        username: req.body.username,
        password: req.body.password

    });

    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
            }
    });



});


app.listen(3000, function(){
    console.log("Server started on port 3000.");
  });
  