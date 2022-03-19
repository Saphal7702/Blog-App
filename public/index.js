function myFunction(key){
  if($("button[name="+key+"]").hasClass("active")){
      $("button[name="+key+"]").removeClass("active");
      $("i[name="+key+"]")[0].classList.remove("fas", "fa-heart");
      $("i[name="+key+"]")[0].classList.add("far", "fa-heart");
      console.log("Unliked");
  }else {
      $("button[name="+key+"]").addClass("active");
      $("i[name="+key+"]")[0].classList.remove("far", "fa-heart");
      $("i[name="+key+"]")[0].classList.add("fas", "fa-heart");
      console.log("Liked");
  }
}

for(let i = 0; i < $(".like-button").length; i++){
  $(".like-button")[i].addEventListener("click",function() {
    var key = this.name;
    console.log(this);
    myFunction(key);
  });
}
