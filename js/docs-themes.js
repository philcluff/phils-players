
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
  if (css_title !== undefined) {
    switch_style(css_title);
  }
}
