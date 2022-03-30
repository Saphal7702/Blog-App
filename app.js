require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

var ensureAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) return next();
  else res.redirect('/login')
}

mongoose.connect("mongodb+srv://saphal7702:"+process.env.DBPASS+"@cluster0.ngbyi.mongodb.net/blogistDB?retryWrites=true&w=majority", {
  useNewUrlParser: true
});

const userinfoSchema = {
  username: String,
  email: String,
  imageURL: String,
  bio: String,
  following: [],
  likedArticles: []
}

const Userinfo = mongoose.model("Userinfo", userinfoSchema);

const postSchema = {
  author: String,
  title: String,
  dateCreated: String,
  content: String,
  likedUsers: [],
}

const Post = mongoose.model("Post", postSchema);

const userSchema = new mongoose.Schema({
  username: String,
  googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id, username: profile.displayName }, function (err, user) {

      Userinfo.findOne({
        username: profile.displayName
      }, function(err, foundUser) {
        if (!foundUser) {
          const userinfo = new Userinfo({
            username: profile.displayName,
            email: "",
            imageURL: profile.photos[0].value,
            bio: ""
          });
          userinfo.save();
        }
      });

      return cb(err, user);
    });
  }
));

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/home",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/");
  });

app.get("/login", function(req, res) {
  res.render("login", {
    Message: "Please enter your login and password!"
  });
});

app.get("/failedlogin", function(req, res) {
  res.render("login", {
    Message: "Invalid Username or Password!!"
  });
});

app.post("/login", function(req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local", {failureRedirect: '/failedlogin', failureMessage: true})(req, res, function() {
        res.redirect("/");
      });
    }
  });
});

app.get("/register", function(req, res) {
  res.render("register", {
    userinfo: "User Name"
  });
});

app.post("/register", function(req, res) {

  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      const user = new Userinfo({
        username: req.body.username,
        email: req.body.email,
        imageURL: "https://img.favpng.com/17/15/15/computer-icons-vector-graphics-person-portable-network-graphics-clip-art-png-favpng-Mpiqqduizneyba1MwZgLaRGeM.jpg",
        bio: ""
      });
      user.save();
      passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      });
    }
  });
});

// Ensures all the routes below are authenticated
app.use(ensureAuthenticated);

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
})


app.post("/like", function(req, res) {
  if (req.xhr || req.accepts('json, html') === 'json') {
    Post.findOne({
      _id: req.body.content
    }, function(err, foundPost) {
      if (!err) {
        if (foundPost.likedUsers.length != 0) {
          for (let i = 0; i < foundPost.likedUsers.length; i++) {
            if (foundPost.likedUsers[i].username === req.user.username) {
              foundPost.likedUsers.splice(i, 1);
              foundPost.save();
              res.send({
                message: "Unlike",
                count: foundPost.likedUsers.length
              });
              break;
            } else if (i === foundPost.likedUsers.length - 1) {
              Userinfo.findOne({
                username: req.user.username
              }, function(err, foundUser) {
                if (!err) {
                  foundPost.likedUsers.push(foundUser);
                  foundPost.save();
                  res.send({
                    message: "Like",
                    count: foundPost.likedUsers.length
                  })
                }
              });
            }
          }
        } else {
          Userinfo.findOne({
            username: req.user.username
          }, function(err, foundUser) {
            if (!err) {
              foundPost.likedUsers.push(foundUser);
              foundPost.save();
              res.send({
                message: "Like",
                count: "1"
              })
            }
          });
        }
      }
    });
  } else {
    console.log("Err");
  }
});

app.post("/follow", function(req, res) {
  if (req.xhr || req.accepts('json, html') === 'json') {
    Userinfo.findOne({
      username: req.user.username
    }, function(err, currentUser) {
      if (!err) {
        if (currentUser.following.length != 0) {
          for (let i = 0; i < currentUser.following.length; i++) {
            if (currentUser.following[i].username === req.body.content) {
              currentUser.following.splice(i, 1);
              currentUser.save();
              res.send({
                message: "+ Follow Author",
              });
              break;
            } else if (i === currentUser.following.length - 1) {
              Userinfo.findOne({
                username: req.body.content
              }, function(err, foundUser) {
                if (!err) {
                  currentUser.following.push(foundUser);
                  currentUser.save();
                  res.send({
                    message: "+ UnFollow Author",
                  });
                }
              });
            }
          }
        } else {
          Userinfo.findOne({
            username: req.body.content
          }, function(err, foundUser) {
            if (!err) {
              currentUser.following.push(foundUser);
              currentUser.save();
              res.send({
                message: "+ UnFollow Author",
              });
            }
          });
        }
      }
    });
  } else {
    console.log("Check");
  }
});

app.get("/", function(req, res) {
  Userinfo.findOne({
    username: req.user.username
  }, function(err, foundUser) {
    if (!err) {
      Post.find({}, function(err, foundPosts) {
        if (!err) {
          res.render("home", {
            users: foundUser.following,
            posts: foundPosts,
            selfuser: req.user.username
          });
        }
      });
    }
  });
});

app.get("/explore", function(req, res) {
  Userinfo.find({}, function(err, foundUser) {
    if (!err) {
      Post.find({}, function(err, foundPosts) {
        if (!err) {
          res.render("explore", {
            users: foundUser,
            posts: foundPosts,
            selfuser: req.user.username
          });
        }
      });
    }
  });
});

app.get("/compose", function(req, res) {
  res.render("compose");
});

function getDate() {
  let today = new Date();

  let options = {
    day: "numeric",
    month: "long",
    year: "numeric"
  };
  let day = today.toLocaleDateString("en-US", options);
  return day;
}

app.post("/compose", function(req, res) {
  const post = new Post({
    author: req.user.username,
    title: req.body.title,
    dateCreated: getDate(),
    content: req.body.content,
  });
  post.save();
  res.redirect("/compose");
});

app.get("/editArticle/:postID", function(req, res) {
  Post.findOne({
    _id: req.params.postID
  }, function(err, foundPost) {
    res.render("edit", {
      post: foundPost
    });
  });
});

app.post("/editArticle/:postID", function(req, res) {
  Post.findOne({
    _id: req.params.postID
  }, function(err, foundPost) {
    foundPost.title = req.body.title;
    foundPost.content = req.body.content;
    foundPost.tag = req.body.tag;
    foundPost.save();
    Userinfo.findOne({
      username: foundPost.author
    }, function(err, foundUser) {
      if (!err) {
        res.render("posts", {
          author: foundUser,
          post: foundPost,
          currentuser: req.user.username
        });
      }
    });
  });
});

app.get("/deleteArticle/:postID", function(req, res) {
  Post.deleteOne({
    _id: req.params.postID
  }, function(err) {
    if (!err) {
      res.redirect("/");
    }
  });
});

app.get("/readmore/:postID", function(req, res) {
  Post.findOne({
    _id: req.params.postID
  }, function(err, foundPost) {
    Userinfo.findOne({
      username: foundPost.author
    }, function(err, foundUser) {
      if (!err) {
        res.render("posts", {
          author: foundUser,
          post: foundPost,
          currentuser: req.user.username
        });
      }
    });
  });
});

app.get("/userprofile/:username", function(req, res) {
  if (req.user.username === req.params.username) {
    res.redirect("/profile");
  } else {
    Userinfo.findOne({
      username: req.params.username
    }, function(err, foundUser) {
      Userinfo.findOne({
        username: req.user.username
      }, function(err, currentUser) {
        if (!err) {
          var follow = "";
          if (currentUser.following.length != 0) {
            for (let i = 0; i < currentUser.following.length; i++) {
              if (currentUser.following[i].username === foundUser.username) {
                follow = "+ Unfollow Author";
                break;
              } else if (i === currentUser.following.length - 1) {
                follow = "+ Follow Author";
              }
            }
          } else {
            follow = "+ Follow Author";
          }
          Post.find({
            author: req.params.username
          }, function(err, foundPosts) {
            if (!err) {
              res.render("userprofiles", {
                user: foundUser,
                posts: foundPosts,
                selfuser: req.user.username,
                followstat: follow
              });
            }
          });
        }
      });
    });
  }
});

app.post("/userprofile", function(req, res) {
  if (req.xhr || req.accepts('json, html') === 'json') {
    if (req.user.username === req.body.content) {
      res.send({
        message: "/profile"
      });
    } else {
      res.send({
        message: "/userprofile/" + req.body.content
      });
    }
  } else {
    console.log("Error");
  }
});

app.get("/profile", function(req, res) {
  Userinfo.findOne({
    username: req.user.username
  }, function(err, foundUser) {
    if (!err) {
      Post.find({
        author: req.user.username
      }, function(err, foundPosts) {
        if (!err) {
          res.render("profile", {
            user: foundUser,
            posts: foundPosts
          });
        }
      });
    }
  });
});

app.get("/likedarticles", function(req, res) {
  Userinfo.findOne({
    username: req.user.username
  }, function(err, foundUser) {
    Userinfo.find({}, function(err, foundUsers) {
      Post.find({}, function(err, foundPosts) {
        if (!err) {
          res.render("likedarticles", {
            user: foundUser,
            posts: foundPosts,
            users: foundUsers
          });
        }
      });
    });
  });
});

app.get("/settings", function(req, res) {
  Userinfo.findOne({
    username: req.user.username
  }, function(err, foundUser) {
    if (!err) {
      res.render("settings", {
        imageURL: foundUser.imageURL,
        username: foundUser.username,
        email: foundUser.email,
        bio: foundUser.bio
      });
    }
  });
});

app.post("/settings", function(req, res) {
  Userinfo.findOne({
    username: req.user.username
  }, function(err, foundUser) {
    if (!err) {
      foundUser.email = req.body.email;
      foundUser.imageURL = req.body.imageURL;
      if (req.body.bio != "") {
        foundUser.bio = req.body.bio;
      }
      foundUser.save();
    }
  });

  if (req.body.oldpassword != "" && req.body.oldpassword != "") {
    req.user.changePassword(req.body.oldpassword, req.body.newpassword, function(err) {
      if (err) {
        console.log(err)
      } else {
        res.redirect("/settings");
      }
    });
  }
  res.redirect("/profile");
});

app.post("/search", function(req, res){
  Userinfo.find({username: {'$regex': req.body.search, $options:'i'}}, function(err, foundUsers){
    if(!err){
      res.render("search",{users: foundUsers});
    }
  });
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started successfully...");
});
