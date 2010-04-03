var YouTubeVideo = function(domObject, url) {
  this.domObject = domObject;
  this.url = url;
};

YouTubeVideo.youTubeRegEx = new RegExp('^http://www.youtube.com/v/');
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
  [new RegExp("var swfArgs = \\{(.*?)\\}"), YouTubeVideo.oldSwfVarsSplitter],
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

YouTubeVideo.prototype.start = function(response) {
  this.videoID = this.videoIDRegEx.exec(this.url);
  
  if (this.videoID) {
    this.videoID = this.videoID[1];
    console.log(this.videoID);
    
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
    console.log('SWF vars not found');
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
    var videoUrl = this.videoRequestStatus[1] ? this.videoHDURL() : this.videoSDURL(),
        videoTag = jQuery('<video controls="controls" width="100%">').attr(
          'src', videoUrl),
        wrapper = jQuery('<div class="v5-wrapper">'),
        controls = jQuery('<div class="v5-controls">');
    wrapper.append(videoTag);
    this.domObject.replaceWith(wrapper);
    wrapper.css({
      'width': videoTag.width(),
      'height': videoTag.height()
    });
    
    videoTag.bind('loadedmetadata', function(e) {
      wrapper.css({
        'width': videoTag.width(),
        'height': videoTag.height()
      });
    });
    
    controls.append(jQuery('<a class="v5-goto" href="' + this.watchURL() + '">'));
    controls.append(jQuery('<a class="v5-download" href="' + videoUrl + '">'));
    wrapper.append(controls);
  }
};

var VideoHandlers = [YouTubeVideo];

jQuery('object, embed').each(function() {
  // We handle three situations:
  // - <embed> alone (as used for example in Google Reader):
  //   <embed src="http://www.youtube.com/v/32vpgNiAH60&amp;hl=en_US&amp;fs=1&amp;" allowscriptaccess="never" allowfullscreen="true" width="480" height="295" wmode="transparent" type="application/x-shockwave-flash">
  //   * type should be application/x-shockwave-flash
  //   * src should be present
  //   * no <object> tag as (direct) parent
  // - Using only <object>, as explained in <http://www.bernzilla.com/item.php?id=681>:
  //   <object type="application/x-shockwave-flash" style="width:425px; height:350px;" data="http://www.youtube.com/v/7_6B6vwE83U">
  //     <param name="movie" value="http://www.youtube.com/v/7_6B6vwE83U" />
  //   </object>
  //   * type should be "applicaiton/x-shockwave-flash"
  //   * data should be present
  //   * no embed inside
  // - YouTube provided code:
  //   <object width="480" height="385">
  //     <param name="movie" value="http://www.youtube.com/v/jwMj3PJDxuo&hl=es_ES&fs=1&"></param>
  //     <param name="allowFullScreen" value="true"></param>
  //     <param name="allowscriptaccess" value="always"></param>
  //     <embed src="http://www.youtube.com/v/jwMj3PJDxuo&hl=es_ES&fs=1&" type="application/x-shockwave-flash" allowscriptaccess="always" allowfullscreen="true" width="480" height="385"></embed>
  //   </object>
  //   * object with no type or data
  //   * embed with type "application/x-shockwave-flash"
  //   * embed with src
  //   * We also have to handle the cases where embed is found before/after
  //     object, but we have already handled object as a whole.
  
  var obj = jQuery(this);
  if (this.tagName == 'EMBED') {
    // First look for the parent.
    var parent = obj.parent();
    if (parent[0].tagName == 'OBJECT') {
      handleObjectTag(parent);
    } else {
      handleEmbedTag(obj);
    }
  } else if (this.tagName == 'OBJECT') {
    handleObjectTag(obj);
  }
});

function handleEmbedTag(obj) {
  if (obj.attr('src') !== undefined &&
      obj.attr('type') == 'application/x-shockwave-flash') {
    handleTagAndURL(obj, obj.attr('src'));
  }
}

function handleObjectTag(obj) {
  if (obj.attr('data-video5-visited') != 'yes') {
    if (obj.attr('data') !== undefined &&
        obj.attr('type') == 'application/x-shockwave-flash') {
      obj.attr('data-video5-visited', 'yes');
      handleTagAndURL(obj, obj.attr('data'));
    } else {
      var children = obj.children('embed');
      if (children.length > 0 &&
          children.attr('src') !== undefined &&
          children.attr('type') == 'application/x-shockwave-flash') {
        obj.attr('data-video5-visited', 'yes');
        handleTagAndURL(obj, children.attr('src'));
      }
    }
  }
}

function handleTagAndURL(obj, url) {
  for (var idx = 0; idx < VideoHandlers.length; idx++) {
    var videoHandler = VideoHandlers[idx];
    
    if (videoHandler.canHandleURL(url)) {
      var vh = new videoHandler(obj, url);
      vh.start();
      break;
    }
  }
}
