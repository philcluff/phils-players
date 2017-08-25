window.onload = function() {
  var player = videojs('example');
  $('#playform').submit(function( event ) {
    var playerSrcOpts = {
      src: $('#manifest').val(),
      type: 'application/dash+xml',
      dashPreprocessing: true
    };
    var licenseUrl = $('#widevine-url').val();
    if (licenseUrl !== '') {
      playerSrcOpts.keySystemOptions = [{
        name: 'com.widevine.alpha',
        options: { serverURL: licenseUrl }
      }]
    }
    player.src(playerSrcOpts);
    player.play();
    event.preventDefault();
  });

  $('#demo').click(function() {
    $('#manifest').val('http://rdmedia.bbc.co.uk/dash/ondemand/testcard/1/client_manifest-events.mpd');
    $('#playform').submit();
  });
};
