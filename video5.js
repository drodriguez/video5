var VideoHandlers = {
  handlers: [],
  
  register: function() {
    for (var idx in arguments) {
      var url = chrome.extension.getURL('handlers/' + arguments[idx] + '.js');
      chrome.extension.sendRequest({action: 'ajax',
        args: {
          type: 'GET',
          url: url
      }},
      // If we just write the callback function, all handler scripts would be
      // associated with one single URL. See
      // http://blog.jbrantly.com/2010/04/creating-javascript-function-inside.html
      (function(u) {
        return function(response) {
          // the special comment allows the eval'd script to be debugged
          var handler = eval('//@ sourceURL=' + u + '\n' +
                             response.data + '()');
          if (handler) {
            VideoHandlers.handlers.push(handler);
          }
        };
      })(url));
    }
  },
  
  handleTagAndURL: function(node, url) {
    var handler;
    for (var idx = 0; idx < this.handlers.length; idx++) {
      var videoHandler = this.handlers[idx];

      if ((handler = videoHandler.tryHandling(node, url)) !== null) {
        handler.start();
        break;
      }
    }
  },
  
  replaceFlashObjectWithVideo: function(domObject, videoUrl, options) {
    var videoTag = jQuery('<video controls="controls">').attr('src', videoUrl),
        wrapper  = jQuery('<div class="v5-wrapper">'),
        controls = jQuery('<div class="v5-controls">');

    if (options.width !== undefined) {
      videoTag[0].setAttribute('width', options.width);
    } else {
      videoTag[0].setAttribute('width', '100%');
    }
    if (options.height !== undefined) {
      videoTag[0].setAttribute('height', options.height);
    }
    if (options.poster !== undefined) {
      videoTag.attr('poster', options.poster);
    }

    wrapper.append(videoTag);
    domObject.replaceWith(wrapper);
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

    if (options.watchURL) {
      controls.append(jQuery('<a class="v5-goto" href="' + options.watchURL + '">'));
    }
    if (options.downloadURL) {
      controls.append(jQuery('<a class="v5-download" href="' + options.downloadURL + '">'));
    }
    wrapper.append(controls);
  }
};
VideoHandlers.register('youtube', 'vimeo', 'jwplayer');

jQuery(window).bind('DOMNodeInserted', function(e) {
  if (e.target.tagName === 'EMBED' || e.target.tagName === 'OBJECT') {
    lookForFlashVideos(e.target);
  } else {
    jQuery('object, embed', e.target).each(function() {
      lookForFlashVideos(this);
    });
  }
});

jQuery(function() {
  jQuery('object, embed').each(function() {
    lookForFlashVideos(this);
  });
});

function lookForFlashVideos(node) {
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

  var nodeObj = jQuery(node);
  if (node.tagName == 'EMBED') {
    // First look for the parent.
    var parent = nodeObj.parent();
    if (parent[0].tagName == 'OBJECT') {
      handleObjectTag(parent);
    } else {
      handleEmbedTag(nodeObj);
    }
  } else if (node.tagName == 'OBJECT') {
    handleObjectTag(nodeObj);
  }
}

function handleEmbedTag(node) {
  if (node.attr('src')  !== undefined &&
      node.attr('type') === 'application/x-shockwave-flash') {
    VideoHandlers.handleTagAndURL(node, node.attr('src'));
  }
}

function handleObjectTag(node) {
  if (node.attr('data-video5-visited') !== 'yes') {
    if (node.attr('data') !== undefined &&
        node.attr('type') === 'application/x-shockwave-flash') {
      node.attr('data-video5-visited', 'yes');
      VideoHandlers.handleTagAndURL(node, node.attr('data'));
    } else {
      var children = node.children('embed');
      if (children.length > 0 &&
          children.attr('src')  !== undefined &&
          children.attr('type') === 'application/x-shockwave-flash') {
        node.attr('data-video5-visited', 'yes');
        VideoHandlers.handleTagAndURL(node, children.attr('src'));
      }
    }
  }
}
