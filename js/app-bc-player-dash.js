const mergeAndRemoveNull = (...args) => {
  const result = videojs.mergeOptions(...args);
  // Any header whose value is `null` will be removed.
  Object.keys(result).forEach(k => {
    if (result[k] === null) {
      delete result[k];
    }
  });
  return result;
};

const customGetLicense = (keySystemOptions) => (emeOptions, keyMessage, callback) => {
  console.log('Get License');
  const headers = mergeAndRemoveNull(
    {'Content-type': 'application/octet-stream'},
    emeOptions.emeHeaders,
    keySystemOptions.licenseHeaders
  );

  videojs.xhr({
    uri: keySystemOptions.url,
    method: 'POST',
    responseType: 'arraybuffer',
    body: keyMessage,
    headers
  }, (err, response, responseBody) => {
    if (err) {
      callback(err);
      return;
    }
    console.log(response.headers);
    callback(null, responseBody);
  });
};

const play = () => {
  var player = videojs('example');
  const
      manifest_url = document.getElementById("manifest").value,
      bcov_auth = document.getElementById('bcov-auth').value,
      widevine_url = document.getElementById('widevine-url').value;
  localStorage.setItem('manifest',manifest_url);
  localStorage.setItem('widevine_url',widevine_url);
  localStorage.setItem('bcov_auth',bcov_auth);
  player.src({
    src: manifest_url,
    type: 'application/dash+xml',
    dashPreprocessing: true,
    emeHeaders: { 'BCOV-Auth': bcov_auth },
    keySystems: {
      'com.widevine.alpha': { getLicense: customGetLicense({ url: widevine_url }) },
    }
  });
  player.play();
}

window.onload = () => {
  const manifest     = document.getElementById('manifest'),
        widevine_url = document.getElementById('widevine-url'),
        bcov_auth = document.getElementById('bcov_auth');

  if (!!localStorage.getItem('manifest')) {
    manifest.value = localStorage.getItem('manifest');
  }
  if (!!localStorage.getItem('widevine_url')) {
    widevine_url.value = localStorage.getItem('widevine_url');
  }
  if (!!localStorage.getItem('bcov_auth')) {
    bcov_auth.value = localStorage.getItem('bcov_auth')
  }
  document.getElementById('playform').onsubmit = () => {
    play();
    return false;
  }
  document.getElementById('demo').onclick = () => {
    manifest.value = 'http://rdmedia.bbc.co.uk/dash/ondemand/testcard/1/client_manifest-events.mpd';
    play();
  };
};
