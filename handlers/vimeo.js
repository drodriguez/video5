(function() {
VimeoVideo = function(domObject, url, flashVars) {
  this.domObject = domObject;
  this.url = url;
  this.clip_id = flashVars.clip_id;
};

VimeoVideo.vimeoRegEx = new RegExp('^http://(?:www\\.)?vimeo\\.com/.+clip_id=(\\d+)');
VimeoVideo.tryHandling = function(node, url) {
  var flashVars = FlashVarsParser.parse(node);
  if (VimeoVideo.vimeoRegEx.test(url) ||
      flashVars.clip_id !== undefined) {
    return new VimeoVideo(node, url, flashVars);
  } else {
    return null;
  }
};

VimeoVideo.prototype.start = function() {
  var match, clipId;
  if (this.clip_id !== undefined) {
    clipId = this.clip_id;
  } else if ((match = VimeoVideo.vimeoRegEx.exec(this.url)) !== null) {
    clipId = match[1];
  } else {
    return;
  }

  this.watchUrl = 'http://vimeo.com/' + clipId;

  var videoUrl = 'http://vimeo.com/play_redirect?clip_id=' + clipId;

  VideoHandlers.replaceFlashObjectWithVideo(this.domObject,
    videoUrl,
    { watchURL: this.watchUrl });
};

return VimeoVideo;
})