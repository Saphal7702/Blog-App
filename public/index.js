function like(key, count){
  console.log("Like");
  $("button[name="+key+"]").addClass("active");
  $("i[name="+key+"]")[0].classList.remove("far", "fa-heart");
  $("i[name="+key+"]")[0].classList.add("fas", "fa-heart");
  $("i[name="+key+"]")[0].innerHTML=" "+count;
}

function unlike(key, count){
  $("button[name="+key+"]").removeClass("active");
  $("i[name="+key+"]")[0].classList.remove("fas", "fa-heart");
  $("i[name="+key+"]")[0].classList.add("far", "fa-heart");
  $("i[name="+key+"]")[0].innerHTML=" "+count;
}

for(let i = 0; i < $(".like-button").length; i++){
  $(".like-button")[i].addEventListener("click",function() {
    var key = this.name;
    $.ajax({
      url:'/like',
      type : 'POST',
      dataType: "json",
      data: {
        content: key
      },
      success: function(data){
        if(data.message === "Like"){
          like(key, data.count);
        } else if(data.message === "Unlike") {
          unlike(key, data.count);
        }else{
          $('div').html('Sorry, an error occured');
        }
      },
      error: function(){
        $('div').html('Sorry, an error occurred');
      }
    });
  });
}
