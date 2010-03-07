;(function() {
  var re = new RegExp('^http://www.youtube.com/v/', 'i');
  var videoIDre = new RegExp('/([A-Z0-9]+)(&|$)', 'i');
  var ytVideoURL = function(videoID) { return "http://www.youtube.com/watch?v=" + videoID; };
  
  jQuery('object[type=application/x-shockwave-flash]').each(function(idx) {
    var obj = jQuery(this);
    if (re.test(obj.attr('data'))) {
      var videoID = videoIDre.exec(obj.attr('data'))[1];
      console.log(videoID);
    }
  });
})();
