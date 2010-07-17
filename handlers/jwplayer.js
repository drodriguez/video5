(function() {

JWPlayerVideo = function(domObject, url, flashVars) {
  this.domObject = domObject;
  this.url = url;
  this.file = flashVars.file;
};

JWPlayerVideo.tryHandling = function(node, url) {
  var flashVars = FlashVarsParser.parse(node);
  if (flashVars.file !== undefined &&
      (/\.(?:mp4|m4v|f4v|ogg|ogv)$/).test(flashVars.file)) {
    return new JWPlayerVideo(node, url, flashVars);
  } else {
    return null;
  }
};

JWPlayerVideo.prototype.start = function() {
  VideoHandlers.replaceFlashObjectWithVideo(this.domObject, this.file,
                                            {downloadURL: this.file});
};

return JWPlayerVideo;

})