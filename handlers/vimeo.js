(function() {
VimeoVideo = function(domObject, url, flashVars) {
  this.domObject = domObject;
  this.url = url;
  this.flashVars = flashVars;
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
  var match;
  if (this.flashVars && this.flashVars.clip_id !== undefined) {
    this.clipId = this.flashVars.clip_id;
  } else if ((match = VimeoVideo.vimeoRegEx.exec(this.url)) !== null) {
    this.clipId = match[1];
  } else {
    return;
  }

  this.watchUrl = 'http://vimeo.com/' + this.clipId;

  var self = this;
  chrome.extension.sendRequest({action: 'ajax',
    args: {
      type: 'GET',
      url: this.xmlURL(this.clipId)
  }}, function() { return self.parseXML.apply(self, arguments); });
  /*
  var videoUrl = 'http://vimeo.com/play_redirect?clip_id=' + clipId;

  VideoHandlers.replaceFlashObjectWithVideo(this.domObject,
    videoUrl,
    { watchURL: this.watchUrl });
  */
};

VimeoVideo.prototype.xmlURL = function(clipId) {
  return "http://vimeo.com/moogaloop/load/clip:" + clipId;
};

VimeoVideo.prototype.parseXML = function(response) {
  if (response.textStatus != 'success') {
    return;
  }

  var node = jQuery('request_signature', response.data);
  if (node.length > 0) {
    this.requestSignature = node.first().text();
  }

  node = jQuery('request_signature_expires', response.data);
  if (node.length > 0) {
    this.requestSignatureExpires = node.first().text();
  }

  /*
  node = jQuery('width', response.data);
  if (node.length > 0) {
    this.width = parseInt(node.first().text(), 10);
  }

  node = jQuery('height', response.data);
  if (node.length > 0) {
    this.height = parseInt(node.first().text(), 10);
  }
  */

  node = jQuery('thumbnail', response.data);
  if (node.length > 0) {
    this.thumbnail = node.first().text();
  }

  node = jQuery('isHD', response.data);
  if (node.length > 0) {
    this.isHD = parseInt(node.first().text(), 10) != 0;
  }

  this.videoSDURL = 'http://vimeo.com/moogaloop/play/clip:' + this.clipId +
    '/' + this.requestSignature + '/' + this.requestSignatureExpires;

  var self = this;
  chrome.extension.sendRequest({action: 'ajax',
    args: {
      type: 'HEAD',
      url: this.videoSDURL
  }}, function() { return self.handleSDVideoResponse.apply(self, arguments); });

  /*
  VideoHandlers.replaceFlashObjectWithVideo(this.domObject,
    videoUrl,
    { watchURL: this.watchUrl,
      poster: this.thumbnail });
  */
};

VimeoVideo.prototype.handleSDVideoResponse = function(response) {
  if (response.textStatus == 'success' &&
    response.headers["Content-Type"] === "video/mp4") {
    VideoHandlers.replaceFlashObjectWithVideo(this.domObject,
       this.videoSDURL,
       { watchURL: this.watchUrl,
         poster: this.thumbnail });
  } else if (response.textStatus == 'error' ||
             response.textStatus == 'timeout') {
    console.log('ouch!');
  }
}

return VimeoVideo;
})