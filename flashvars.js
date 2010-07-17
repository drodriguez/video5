var FlashVarsParser = {};

FlashVarsParser.parse = function(domObject) {
  var varsString = domObject.attr("flashvars")
                || domObject.children()
                            .filter("param[name=flashvars]")
                            .attr("value")
                || "";
  var result = {};
  var keyValueRegExp = new RegExp("^([^=]+)=(.*)$");
  varsString.split("&").forEach(function(item) {
    var match;
    if ((match = keyValueRegExp.exec(item)) !== null) {
      result[match[1]] = match[2];
    }
  });
  
  return result;
};
