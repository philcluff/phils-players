
var theme_name = "phils-player-theme" ;

function switch_style(css_title) {
  var i, link_tag ;
  for (i = 0, link_tag = document.getElementsByTagName("link") ;
    i < link_tag.length ; i++ ) {
    if ((link_tag[i].rel.indexOf("stylesheet") != -1) && link_tag[i].title) {
      link_tag[i].disabled = true ;
      if (link_tag[i].title == css_title) {
        link_tag[i].disabled = false ;
      }
    }
    localStorage.setItem(theme_name, css_title);
  }
}

function set_style() {
  var css_title = localStorage.getItem(theme_name)
  // Set theme if it's a known theme, otherwise use default:
  if (css_title == "default" || css_title == "dark") {
    switch_style(css_title);
  } else {
    switch_style("default");
  }
}

// split the GET parameters
function getURLParameter(param) {
  var pageUrl = window.location.search.substring(1);
  var urlVars = pageUrl.split('&');

  // iterate over the parameters, and try to match
  for (var i = 0; i < urlVars.length; i++) {
    var paramName = urlVars[i].split('=');

    // if match (case insensitive), return it or false
    if (paramName[0].toLowerCase() == param.toLowerCase()) {
      return paramName[1];
    }
  }
  return false;
}

// for when there is a single manifest
function insertSelectedManifest(kind){
  if (kind == "hls") {
    if (getURLParameter("hls")){
      $("#manifest").val(getURLParameter("hls"));
      $("#hls-button").trigger( "click" );
    }
  }

  if (kind == "dash") {
    if (getURLParameter("dash")){
      $("#manifest").val(getURLParameter("dash"));
      $("#dash-button").trigger( "click" );
    }
  }
}

// if there is a GET parameter for hls or dash, insert them into the input fields
function insertManifestsFromGet(){

  // hls
  if (getURLParameter("hls")){
    $("#hls-manifest").val(getURLParameter("hls"));
  }

  // dash
  if (getURLParameter("dash")){
    $("#dash-manifest").val(getURLParameter("dash"));
  }

  // insert buttons for custom behavior if only single #manifest
  if ($("#manifest").length == 1)
  {
      if (getURLParameter("hls")) {
        $(".form-group").append('<button type="button" onclick="insertSelectedManifest(\'hls\')" id="hls-get" class="btn btn-info btn-sm">Load your GET HLS Manifest</button>');
      }

      if (getURLParameter("dash")){
        $(".form-group").append('<button type="button" onclick="insertSelectedManifest(\'dash\')" id="dash-get" class="btn btn-info btn-sm">Load your GET DASH Manifest</button>');
      }
      
  }
    
};