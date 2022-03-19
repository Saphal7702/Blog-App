const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/blogistDB", {useNewUrlParser: true});

const userinfoSchema = {
  username: String,
  email: String,
  imageURL: String,
  bio: String,
  following:[],
  likedArticles: []
}

const Userinfo = mongoose.model("Userinfo", userinfoSchema);

const postSchema = {
  author: String,
  title: String,
  dateCreated: String,
  content: String,
  likedUsers: [],
  tags: String
}

const Post = mongoose.model("Post", postSchema);

const userSchema = new mongoose.Schema ({});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


app.get("/", function(req, res){
  res.render("login",{Username: "User Name", Password: "Password"});
});

app.post("/", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/home");
      });
    }
  });
});

app.get("/register", function(req,res){
  res.render("register",{userinfo: "User Name"});
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      const user = new Userinfo ({
        username: req.body.username,
        email: req.body.email,
        imageURL:"https://img.favpng.com/17/15/15/computer-icons-vector-graphics-person-portable-network-graphics-clip-art-png-favpng-Mpiqqduizneyba1MwZgLaRGeM.jpg",
        bio:""
      });
      user.save();
      passport.authenticate("local")(req, res, function(){
        res.redirect("/");
      });
    }
  });
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
})

app.post("/like", function(req, res){
  Post.findOne({_id: req.body.like}, function(err, foundPost){
    if(!err){
      if(foundPost.likedUsers.length != 0){
        for(let i=0; i<foundPost.likedUsers.length; i++){
          if(foundPost.likedUsers[i].username === req.user.username){
            foundPost.likedUsers.splice(i,1);
            foundPost.save();
            break;
          }else if(i === foundPost.likedUsers.length-1){
            Userinfo.findOne({username: req.user.username}, function(err, foundUser){
              if(!err){
                foundPost.likedUsers.push(foundUser);
                foundPost.save();
              }
            });
          }
        }
      }else{
        Userinfo.findOne({username: req.user.username}, function(err, foundUser){
          if(!err){
            foundPost.likedUsers.push(foundUser);
            foundPost.save();
          }
        });
       }
    }
  });
  res.redirect("/"+ req.body.route);
});

app.get("/home", function(req, res){
  if(req.isAuthenticated()){
    res.render("home");
  }else{
    res.redirect("/");
  }
});

app.get("/explore", function(req, res){
  if(req.isAuthenticated()){

    Userinfo.find({}, function(err, foundUser){
      if(!err){
        Post.find({}, function(err, foundPosts){
          if(!err){
            res.render("explore",{users: foundUser, posts: foundPosts, selfuser: req.user.username});
          }
        });
      }
    });

  }else{
    res.redirect("/");
  }
});

app.get("/compose", function(req, res){
  if(req.isAuthenticated()){
    res.render("compose");
  }else{
    res.redirect("/");
  }
});

function getDate(){
  let today = new Date();

  let options = {
    day: "numeric",
    month: "long",
    year: "numeric"
  };

  let day = today.toLocaleDateString("en-US", options);
  return day;
}

app.post("/compose", function(req, res){
  const post = new Post({
    author: req.user.username,
    title: req.body.title,
    dateCreated: getDate(),
    content: req.body.content,
    tags: req.body.tags
  });
  post.save();
  res.redirect("/compose");
});

app.get("/posts", function(req,res){
  res.render("posts");
});

app.get("/userprofile/:username", function(req, res){
  if(req.user.username === req.params.username){
    res.redirect("/profile");
  }else{
    console.log(req.params.username);
    Userinfo.findOne({username: req.params.username}, function(err, foundUser){
      if(!err){
        Post.find({author: req.params.username}, function(err, foundPosts){
          if(!err){
            res.render("profile",{user: foundUser, posts: foundPosts});
          }
        });
      }
    });
  }
});

app.post("/userprofile", function(req, res){
  if(req.user.username === req.body.userlink){
    res.redirect("/profile");
  }else{
    res.redirect("/userprofile");
  }
});

app.get("/profile", function(req, res){
  Userinfo.findOne({username: req.user.username}, function(err, foundUser){
    if(!err){
      Post.find({author: req.user.username}, function(err, foundPosts){
        if(!err){
          res.render("profile",{user: foundUser, posts: foundPosts});
        }
      });
    }
  });
});

app.get("/settings", function(req, res){
  if(req.isAuthenticated()){
    Userinfo.findOne({username: req.user.username}, function(err, foundUser){
      if(!err){
        res.render("settings",{imageURL: foundUser.imageURL, username: foundUser.username, email: foundUser.email});
      }
    });
  }else{
    res.redirect("/");
  }
});

app.post("/settings", function(req, res){
  Userinfo.findOne({username: req.user.username}, function(err, foundUser){
    if(!err){
      foundUser.email = req.body.email;
      foundUser.imageURL = req.body.imageURL;
      if(req.body.bio != ""){
        foundUser.bio = req.body.bio;
      }
      foundUser.save();
    }
  });

  if(req.body.oldpassword != "" && req.body.oldpassword != ""){
    req.user.changePassword(req.body.oldpassword, req.body.newpassword, function(err){
      if(err){
        console.log(err)
      }else{
        res.redirect("/settings");
      }
    });
  }
  res.redirect("/settings");
});

app.listen(3000, function(){
  console.log("Server started in given port");
});
