(function() {
var YouTubeVideo = function(domObject, url) {
  this.domObject = domObject;
  this.url = url;
};

YouTubeVideo.youTubeRegEx = new RegExp('^http://www\.youtube\.com/v/');
YouTubeVideo.canHandleURL = function(url) {
  return YouTubeVideo.youTubeRegEx.test(url);
};

YouTubeVideo.prototype.videoIDRegEx = new RegExp('/([-_A-Z0-9]+)(&|$)', 'i');

YouTubeVideo.oldSwfVarsSplitter = function(flashVarsRaw) {
  var flashVars = {};
  flashVarsRaw = flashVarsRaw.split(', ');
  for (var idx = 0; idx < flashVarsRaw.length; idx++) {
    var keyValues = flashVarsRaw[idx].split(': '),
        key = keyValues.shift(),
        val = keyValues.join(': ');
    
    if (key.charAt(0) == '"') {
      key = key.substring(1, key.length - 1);
    }
    
    if (val.charAt(0) == '"') {
      val = val.substring(1, val.length - 1);
    }
    
    flashVars[key] = val;
  }
  
  return flashVars;
};

YouTubeVideo.newFlashvarsSplitter = function(flashVarsRaw) {
  var flashVars = {};
  flashVarsRaw = flashVarsRaw.split('&');
  for (var idx = 0; idx < flashVarsRaw.length; idx++) {
    var keyValues = flashVarsRaw[idx].split('='),
        key = keyValues.shift(),
        val = keyValues.join('=');
    
    flashVars[key] = val;
  }
  
  return flashVars;
};

YouTubeVideo.prototype.swfVarsRegEx = [
  [new RegExp('<param name=\\\\"flashvars\\\\" value=\\\\"(.*?)\\\\">'), YouTubeVideo.newFlashvarsSplitter],
  [new RegExp("var swf(?:Args|Config) = \\{(.*?)\\}"), YouTubeVideo.oldSwfVarsSplitter],
  [new RegExp("'SWF_ARGS': \\{(.*?)\\}"), YouTubeVideo.oldSwfVarsSplitter]
];

YouTubeVideo.prototype.watchURL = function() {
  return "http://www.youtube.com/watch?v=" + this.videoID;
};

YouTubeVideo.prototype.videoSDURL = function() {
  return "http://www.youtube.com/get_video?fmt=18&video_id=" + this.videoID + "&t=" + this.videoHash;
};

YouTubeVideo.prototype.videoHDURL = function() {
  return "http://www.youtube.com/get_video?fmt=22&video_id=" + this.videoID + "&t=" + this.videoHash;
};

YouTubeVideo.prototype.start = function() {
  this.videoID = this.videoIDRegEx.exec(this.url);
  
  if (this.videoID) {
    this.videoID = this.videoID[1];
    
    var self = this;
    chrome.extension.sendRequest({action: 'ajax',
      args: {
        type: 'GET',
        url: this.watchURL()
    }}, function() { return self.parseSwfVars.apply(self, arguments); });
  }
};

YouTubeVideo.prototype.parseSwfVars = function(response) {
  if (response.textStatus != 'success') {
    return;
  }
  
  var flashVarsRaw = null,
      idx = 0;
  for (idx = 0; flashVarsRaw == null && idx < this.swfVarsRegEx.length; idx++) {
    flashVarsRaw = this.swfVarsRegEx[idx][0].exec(response.data);
  }
  
  if (flashVarsRaw == null) {
    return; // we haven't found the flashVars
  }
  idx -= 1; // idx gets increased before exiting the loop
  
  this.flashVars = this.swfVarsRegEx[idx][1](flashVarsRaw[1]);
  this.videoHash = this.flashVars['t'];
  
  this.videoRequestStatus = [null, null];
  
  var self = this;
  chrome.extension.sendRequest({action: 'ajax',
    args: {
      type: 'HEAD',
      url: this.videoSDURL()
  }}, function() { return self.handleSDVideoResponse.apply(self, arguments); });
  
  chrome.extension.sendRequest({action: 'ajax',
    args: {
      type: 'HEAD',
      url: this.videoHDURL()
  }}, function() { return self.handleHDVideoResponse.apply(self, arguments); });
};

YouTubeVideo.prototype.handleSDVideoResponse = function(response) {
  if (response.textStatus == 'success') {
    this.videoRequestStatus[0] = true;
  } else if (response.textStatus == 'error' ||
             response.textStatus == 'timeout') {
    this.videoRequestStatus[0] = false;
  }
  
  this.replaceFlashObjectWithVideo();
};

YouTubeVideo.prototype.handleHDVideoResponse = function(response) {
  if (response.textStatus == 'success') {
    this.videoRequestStatus[1] = true;
  } else if (response.textStatus == 'error' ||
             response.textStatus == 'timeout') {
    this.videoRequestStatus[1] = false;
  }
  
  this.replaceFlashObjectWithVideo();
};

YouTubeVideo.prototype.replaceFlashObjectWithVideo = function() {
  if (this.videoRequestStatus[1] || this.videoRequestStatus[0]) {
    var videoURL = this.videoRequestStatus[1] ? this.videoHDURL() : this.videoSDURL();
    VideoHandlers.replaceFlashObjectWithVideo(this.domObject,
      videoURL,
      { watchURL: this.watchURL(), downloadURL: videoURL });
  }
};

return YouTubeVideo;
})