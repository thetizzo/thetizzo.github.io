$(document).ready(function() {
  $('.collapse').on('shown.bs.collapse', function (e) {
    clicked = $(document).find("[data-target='#" + $(e.target).attr('id') + "']").children().first();
    clicked.removeClass("fa-angle-double-down");
    clicked.addClass("fa-angle-double-up");
  });

  $('.collapse').on('hidden.bs.collapse', function (e) {
    clicked = $(document).find("[data-target='#" + $(e.target).attr('id') + "']").children().first();
    clicked.removeClass("fa-angle-double-up");
    clicked.addClass("fa-angle-double-down");
  });
});
