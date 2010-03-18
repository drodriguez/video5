;(function() {
  var re = new RegExp('^http://www.youtube.com/v/', 'i');
  var videoIDre = new RegExp('/([A-Z0-9]+)(&|$)', 'i');
  var ytWatchURL = function(videoID) { return "http://www.youtube.com/watch?v=" + videoID; };
  var ytVideoSDURL = function(videoID, videoHash) { return "http://www.youtube.com/get_video?fmt=18&video_id=" + videoID + "&t=" + videoHash; };
  var ytVideoHDURL = function(videoID, videoHash) { return "http://www.youtube.com/get_video?fmt=22&video_id=" + videoID + "&t=" + videoHash; };
  var ytSwfVarsRe = [new RegExp("var swfArgs = \\{(.*?)\\}"), new RegExp("'SWF_ARGS': \\{(.*?)\\}")];
  
  jQuery('object[type=application/x-shockwave-flash]').each(function(idx) {
    var obj = jQuery(this);
    if (re.test(obj.attr('data'))) {
      var videoID = videoIDre.exec(obj.attr('data'))[1];
      console.log(videoID);
      chrome.extension.sendRequest({action: 'ajax',
        args: {
          type: 'GET',
          url: ytWatchURL(videoID)
      }}, function(response) { handleFlashVars(response, obj, videoID); });
    }
  });
  
  function handleFlashVars(response, obj, videoID) {
    if (response.textStatus != 'success') {
      return;
    }
    
    var flashVarsRaw = null;
    for (var idx = 0; flashVarsRaw == null && idx < ytSwfVarsRe.length; idx++) {
      flashVarsRaw = ytSwfVarsRe[idx].exec(response.data);
    }
    
    if (flashVarsRaw == null) {
      console.log('SWF vars not found');
      return; // we haven't found the flashVars
    }
    
    flashVars = {};
    flashVarsRaw = flashVarsRaw[1].split(', ');
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
    
    videoHash = flashVars['t'];
    
    var pingReady = [false, false];
    chrome.extension.sendRequest({action: 'ajax',
      args: {
        type: 'HEAD',
        url: ytVideoSDURL(videoID, videoHash)
    }}, function(response) { handlePingSDVideo(response, obj, videoID, videoHash, pingReady); });
    
    chrome.extension.sendRequest({action: 'ajax',
      args: {
        type: 'HEAD',
        url: ytVideoHDURL(videoID, videoHash)
    }}, function(response) { handlePingHDVideo(response, obj, videoID, videoHash, pingReady); });
  }
  
  function handlePingSDVideo(response, obj, videoID, videoHash, pingReady) {
    console.log('handlePingSDVideo ' + response.textStatus);
    if (response.textStatus != 'success') {
      return;
    }
    
    var videoTag = jQuery('<video src="' + ytVideoSDURL(videoID, videoHash) + '" controls="controls" width="100%" />');
    
    obj.replaceWith(videoTag);
  }

  function handlePingHDVideo(response, obj, videoID, videoHash, pingReady) {
    console.log('handlePingHDVideo ' + response.textStatus + ' ' + response.responseHeaders);
    if (response.textStatus != 'success') {
      return;
    }
  }
})();
