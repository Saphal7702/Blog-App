const express = require("express");
// const body-Parser = require("body-parser");
// const ejs = require("ejs");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');

app.get("/", function(req, res){
  // res.sendFile(__dirname + "/login.html");
  res.render("profile");
});

app.listen(3000, function(){
  console.log("Server started in given port");
});
