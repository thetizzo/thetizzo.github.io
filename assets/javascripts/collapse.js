"use strict";

document.addEventListener("DOMContentLoaded", function() {
  var collapsible = document.querySelectorAll("[data-toggle=collapse]")

  Array.prototype.forEach.call(collapsible, function(el, i) {
    el.addEventListener("click", function(event) {
      var clicked = event.currentTarget;
      var collapse = document.querySelector(clicked.getAttribute("data-target"));
      var clicked_icon = clicked.children[0];

      // Toggle Display of Accomplishments
      if(collapse.style.display === "block") {
        collapse.style.display = "none";
      } else {
        collapse.style.display = "block";
      }

      // Change Icon
      clicked_icon.classList.toggle("fa-angle-double-up")
      clicked_icon.classList.toggle("fa-angle-double-down")
    });
  });
});
