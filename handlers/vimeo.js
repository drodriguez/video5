(function() {
VimeoVideo = function(domObject, url) {
  this.domObject = domObject;
  this.url = url;
};

VimeoVideo.vimeoRegEx = new RegExp('^http://(?:www\\.)?vimeo\\.com/.+clip_id=(\\d+)');
VimeoVideo.tryHandling = function(node, url) {
  if (VimeoVideo.vimeoRegEx.test(url)) {
    return new VimeoVideo(node, url);
  } else {
    return null;
  }
};

VimeoVideo.prototype.start = function() {
  var match = VimeoVideo.vimeoRegEx.exec(this.url);
  if (match) {
    this.clipId = match[1];
    this.watchUrl = 'http://vimeo.com/' + this.clipId;
    
    var videoUrl = 'http://vimeo.com/play_redirect?clip_id=' + this.clipId;

    VideoHandlers.replaceFlashObjectWithVideo(this.domObject,
      videoUrl,
      { watchURL: this.watchUrl });
  }
};

return VimeoVideo;
})