"use strict";

$(document).ready(function() {
  $('[data-toggle=collapse]').on('click', function(e) {
    var clicked = $(this);
    var collapse = $(clicked.data('target'));
    var clicked_icon = clicked.children().first();

    // Toggle Display of Accomplishments
    collapse.slideToggle('fast', 'linear');

    // Change Icon
    clicked_icon.toggleClass("fa-angle-double-up fa-angle-double-down");
  });
});
