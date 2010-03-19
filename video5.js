;(function() {
  var re = new RegExp('^http://www.youtube.com/v/', 'i');
  var videoIDre = new RegExp('/([-A-Z0-9]+)(&|$)', 'i');
  var ytWatchURL = function(videoID) { return "http://www.youtube.com/watch?v=" + videoID; };
  var ytVideoSDURL = function(videoID, videoHash) { return "http://www.youtube.com/get_video?fmt=18&video_id=" + videoID + "&t=" + videoHash; };
  var ytVideoHDURL = function(videoID, videoHash) { return "http://www.youtube.com/get_video?fmt=22&video_id=" + videoID + "&t=" + videoHash; };
  var ytSwfVarsRe = [new RegExp("var swfArgs = \\{(.*?)\\}"), new RegExp("'SWF_ARGS': \\{(.*?)\\}")];
  
  jQuery('object[type=application/x-shockwave-flash], object > param[name=movie]').each(modifyObjectOrEmbed);
  
  function modifyObjectOrEmbed() {
    var obj = jQuery(this);
    
    var videoID = null;
    if (obj[0].tagName == 'PARAM') {
      videoID = videoIDre.exec(obj.attr('value'));
      obj = obj.parent();
    } else if (obj[0].tagName == 'OBJECT') {
      videoID = videoIDre.exec(obj.attr('data'));
    }
    
    if (videoID) {
      // this is actually a YouTube video
      videoID = videoID[1];
      console.log(videoID);
      chrome.extension.sendRequest({action: 'ajax',
        args: {
          type: 'GET',
          url: ytWatchURL(videoID)
      }}, function(response) { handleFlashVars(response, obj, videoID); });
    }
  }
  
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
    
    var pingReady = [null, null];
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
    if (response.textStatus == 'success') {
      pingReady[0] = function() {
        var videoTag = jQuery('<video src="' + ytVideoSDURL(videoID, videoHash) + '" controls="controls" width="100%" />');
        obj.replaceWith(videoTag);
      }
    } else if (response.textStatus == 'error') {
      pingReady[0] = false;
    }
    
    if (pingReady[1] != null && pingReady[1] != false) {
      console.log('HD from SD callback');
      pingReady[1]();
    }
  }

  function handlePingHDVideo(response, obj, videoID, videoHash, pingReady) {
    if (response.textStatus == 'success') {
      pingReady[1] = function() {
        var videoTag = jQuery('<video src="' + ytVideoHDURL(videoID, videoHash) + '" controls="controls" width="100%" />');
        obj.replaceWith(videoTag);
      }
    } else if (response.textStatus == 'error') {
      pingReady[1] = false;
    }
    
    if (pingReady[1] != null && pingReady[1] != false) {
      console.log('HD from HD callback');
      pingReady[1]();
    } else if (pingReady[0] != null && pingReady[0] != false) {
      console.log('SD from HD callback');
      pingReady[0]();
    }
  }
})();
