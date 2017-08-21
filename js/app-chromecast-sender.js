// Copyright 2016 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


'use strict';

/**
 * Width of progress bar in pixel
 * @const
 */
var PROGRESS_BAR_WIDTH = 600;

/** @const {number} Time in milliseconds for minimal progress update */
var TIMER_STEP = 1000;

/** @const {number} Cast volume upon initial connection */
var DEFAULT_VOLUME = 0.5;

/** @const {number} Height, in pixels, of volume bar */
var FULL_VOLUME_HEIGHT = 100;

/**
 * Constants of states for media playback
 * @enum {string}
 */
var PLAYER_STATE = {
    IDLE: 'IDLE',
    LOADING: 'LOADING',
    LOADED: 'LOADED',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    STOPPED: 'STOPPED',
    ERROR: 'ERROR'
};

/**
 * Cast player object
 * Main variables:
 *  - PlayerHandler object for handling media playback
 *  - Cast player variables for controlling Cast mode media playback
 *  - Current media variables for transition between Cast and local modes
 * @struct @constructor
 */
var CastPlayer = function() {
    /** @type {PlayerHandler} Delegation proxy for media playback */
    this.playerHandler = new PlayerHandler(this);

    /** @type {PLAYER_STATE} A state for media playback */
    this.playerState = PLAYER_STATE.IDLE;

    /* Cast player variables */
    /** @type {cast.framework.RemotePlayer} */
    this.remotePlayer = null;
    /** @type {cast.framework.RemotePlayerController} */
    this.remotePlayerController = null;

    /* Current media variables */
    /** @type {number} A number for current media index */
    this.currentMediaIndex = 0;
    /** @type {number} A number for current media time */
    this.currentMediaTime = 0;
    /** @type {number} A number for current media duration */
    this.currentMediaDuration = -1;
    /** @type {?number} A timer for tracking progress of media */
    this.timer = null;

    /** @type {Object} media contents from JSON */
    this.mediaContents = null;

    /** @type {boolean} Fullscreen mode on/off */
    this.fullscreen = false;

    /** @type {function()} */
    this.incrementMediaTimeHandler = this.incrementMediaTime.bind(this);

    this.setupLocalPlayer();
    this.initializeUI();
};

CastPlayer.prototype.initializeCastPlayer = function() {

    var options = {};

    // Set the receiver application ID to your own (created in the
    // Google Cast Developer Console), or optionally
    // use the chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID
    // options.receiverApplicationId = '4F8B3483';
    options.receiverApplicationId = 'BD473556';

    // Auto join policy can be one of the following three:
    // ORIGIN_SCOPED - Auto connect from same appId and page origin
    // TAB_AND_ORIGIN_SCOPED - Auto connect from same appId, page origin, and tab
    // PAGE_SCOPED - No auto connect
    options.autoJoinPolicy = chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED;

    cast.framework.CastContext.getInstance().setOptions(options);

    this.remotePlayer = new cast.framework.RemotePlayer();
    this.remotePlayerController = new cast.framework.RemotePlayerController(this.remotePlayer);
    this.remotePlayerController.addEventListener(
        cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
        this.switchPlayer.bind(this)
    );
};

/*
 * PlayerHandler and setup functions
 */

CastPlayer.prototype.switchPlayer = function() {
    this.stopProgressTimer();
    this.resetVolumeSlider();
    this.playerHandler.stop();
    this.playerState = PLAYER_STATE.IDLE;
    if (cast && cast.framework) {
        if (this.remotePlayer.isConnected) {
            this.setupRemotePlayer();
            return;
        }
    }
    this.setupLocalPlayer();
};

/**
 * PlayerHandler
 *
 * This is a handler through which the application will interact
 * with both the RemotePlayer and LocalPlayer. Combining these two into
 * one interface is one approach to the dual-player nature of a Cast
 * Chrome application. Otherwise, the state of the RemotePlayer can be
 * queried at any time to decide whether to interact with the local
 * or remote players.
 *
 * To set the player used, implement the following methods for a target object
 * and call setTarget(target).
 *
 * Methods to implement:
 *  - play()
 *  - pause()
 *  - stop()
 *  - seekTo(time)
 *  - load(mediaIndex)
 *  - getMediaDuration()
 *  - getCurrentMediaTime()
 *  - setVolume(volumeSliderPosition)
 *  - mute()
 *  - unMute()
 *  - isMuted()
 *  - updateDisplayMessage()
 */
var PlayerHandler = function(castPlayer) {
    this.target = {};

    this.setTarget= function(target) {
        this.target = target;
    };

    this.play = function() {
        if (castPlayer.playerState !== PLAYER_STATE.PLAYING &&
            castPlayer.playerState !== PLAYER_STATE.PAUSED &&
            castPlayer.playerState !== PLAYER_STATE.LOADED) {
            this.load(castPlayer.currentMediaIndex);
            return;
        }

        this.target.play();
        castPlayer.playerState = PLAYER_STATE.PLAYING;
        document.getElementById('play').style.display = 'none';
        document.getElementById('pause').style.display = 'block';
        this.updateDisplayMessage();
    };

    this.pause = function() {
        if (castPlayer.playerState !== PLAYER_STATE.PLAYING) {
            return;
        }

        this.target.pause();
        castPlayer.playerState = PLAYER_STATE.PAUSED;
        document.getElementById('play').style.display = 'block';
        document.getElementById('pause').style.display = 'none';
        this.updateDisplayMessage();
    };

    this.stop = function() {
        this.pause();
        castPlayer.playerState = PLAYER_STATE.STOPPED;
        this.updateDisplayMessage();
    };

    this.load = function(mediaIndex) {
        castPlayer.playerState = PLAYER_STATE.LOADING;
        this.target.load(mediaIndex);
        this.updateDisplayMessage();
    };

    this.loaded = function() {
        castPlayer.currentMediaDuration = this.getMediaDuration();
        castPlayer.updateMediaDuration();
        castPlayer.playerState = PLAYER_STATE.LOADED;
        if (castPlayer.currentMediaTime > 0) {
            this.seekTo(castPlayer.currentMediaTime);
        }
        this.play();
        castPlayer.startProgressTimer();
        this.updateDisplayMessage();
    };

    this.getCurrentMediaTime = function() {
        return this.target.getCurrentMediaTime();
    };

    this.getMediaDuration = function() {
        return this.target.getMediaDuration();
    };

    this.updateDisplayMessage = function () {
        this.target.updateDisplayMessage();
    }
;
    this.setVolume = function(volumeSliderPosition) {
        this.target.setVolume(volumeSliderPosition);
    };

    this.mute = function() {
        this.target.mute();
        document.getElementById('audio_on').style.display = 'none';
        document.getElementById('audio_off').style.display = 'block';
    };

    this.unMute = function() {
        this.target.unMute();
        document.getElementById('audio_on').style.display = 'block';
        document.getElementById('audio_off').style.display = 'none';
    };

    this.isMuted = function() {
        return this.target.isMuted();
    };

    this.seekTo = function(time) {
        this.target.seekTo(time);
        this.updateDisplayMessage();
    };
};

/**
 * Set the PlayerHandler target to use the video-element player
 */
CastPlayer.prototype.setupLocalPlayer = function () {
    var localPlayer = document.getElementById('video_element');
    localPlayer.addEventListener(
        'loadeddata', this.onMediaLoadedLocally.bind(this));

    // This object will implement PlayerHandler callbacks with localPlayer
    var playerTarget = {};

    playerTarget.play = function() {
        localPlayer.play();
        localPlayer.style.display = 'block';
    };

    playerTarget.pause = function () {
        localPlayer.pause();
    };

    playerTarget.stop = function () {
        localPlayer.stop();
    };

    playerTarget.load = function(mediaIndex) {
        localPlayer.load();
    }.bind(this);

    playerTarget.getCurrentMediaTime = function() {
        return localPlayer.currentTime;
    };

    playerTarget.getMediaDuration = function() {
        return localPlayer.duration;
    };

    playerTarget.updateDisplayMessage = function () {
        document.getElementById('playerstate').style.display = 'none';
        document.getElementById('playerstatebg').style.display = 'none';
    };

    playerTarget.setVolume = function(volumeSliderPosition) {
        localPlayer.volume = volumeSliderPosition < FULL_VOLUME_HEIGHT ?
            volumeSliderPosition / FULL_VOLUME_HEIGHT : 1;
        var p = document.getElementById('audio_bg_level');
        p.style.height = volumeSliderPosition + 'px';
        p.style.marginTop = -volumeSliderPosition + 'px';
    };

    playerTarget.mute = function() {
        localPlayer.muted = true;
    };

    playerTarget.unMute = function() {
        localPlayer.muted = false;
    };

    playerTarget.isMuted = function() {
        return localPlayer.muted;
    };

    playerTarget.seekTo = function(time) {
        localPlayer.currentTime = time;
    };

    this.playerHandler.setTarget(playerTarget);

    this.playerHandler.setVolume(DEFAULT_VOLUME * FULL_VOLUME_HEIGHT);

    this.showFullscreenButton();

    if (this.currentMediaTime > 0) {
        this.playerHandler.play();
    }
};

/**
 * Set the PlayerHandler target to use the remote player
 */
CastPlayer.prototype.setupRemotePlayer = function () {
    var castSession = cast.framework.CastContext.getInstance().getCurrentSession();

    // Add event listeners for player changes which may occur outside sender app
    this.remotePlayerController.addEventListener(
        cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED,
        function() {
            if (this.remotePlayer.isPaused) {
                this.playerHandler.pause();
            } else {
                this.playerHandler.play();
            }
        }.bind(this)
    );

    this.remotePlayerController.addEventListener(
        cast.framework.RemotePlayerEventType.IS_MUTED_CHANGED,
        function() {
            if (this.remotePlayer.isMuted) {
                this.playerHandler.mute();
            } else {
                this.playerHandler.unMute();
            }
        }.bind(this)
    );

    this.remotePlayerController.addEventListener(
        cast.framework.RemotePlayerEventType.VOLUME_LEVEL_CHANGED,
        function() {
            var newVolume = this.remotePlayer.volumeLevel * FULL_VOLUME_HEIGHT;
            var p = document.getElementById('audio_bg_level');
            p.style.height = newVolume + 'px';
            p.style.marginTop = -newVolume + 'px';
        }.bind(this)
    );

    // This object will implement PlayerHandler callbacks with
    // remotePlayerController, and makes necessary UI updates specific
    // to remote playback
    var playerTarget = {};

    playerTarget.play = function () {
        if (this.remotePlayer.isPaused) {
            this.remotePlayerController.playOrPause();
        }
        var localPlayer = document.getElementById('video_element');
        localPlayer.style.display = 'none';
    }.bind(this);

    playerTarget.pause = function () {
        if (!this.remotePlayer.isPaused) {
            this.remotePlayerController.playOrPause();
        }
    }.bind(this);

    playerTarget.stop = function () {
         this.remotePlayerController.stop();
    }.bind(this);

    playerTarget.load = function (mediaIndex) {
        var mediaID = document.getElementById('manifest').value
        console.log('Loading...' + mediaID);
        var licenseURL = document.getElementById('widevine-url').value
        if (licenseURL !== '') {
          mediaID = btoa(JSON.stringify({url: mediaID,licenseURL: licenseURL}))
        }
        var mediaInfo = new chrome.cast.media.MediaInfo(mediaID, 'video/mp4');
        mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
        mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
        mediaInfo.metadata.title = 'Demo Player';
        var request = new chrome.cast.media.LoadRequest(mediaInfo);
        castSession.loadMedia(request).then(
            this.playerHandler.loaded.bind(this.playerHandler),
            function (errorCode) {
                this.playerState = PLAYER_STATE.ERROR;
                console.log('Remote media load error: ' +
                    CastPlayer.getErrorMessage(errorCode));
            }.bind(this));
    }.bind(this);

    playerTarget.getCurrentMediaTime = function() {
        return this.remotePlayer.currentTime;
    }.bind(this);

    playerTarget.getMediaDuration = function() {
        return this.remotePlayer.duration;
    }.bind(this);

    playerTarget.updateDisplayMessage = function () {
        document.getElementById('playerstate').style.display = 'block';
        document.getElementById('playerstatebg').style.display = 'block';
        document.getElementById('playerstate').innerHTML =
            this.playerState + ' on ' + castSession.getCastDevice().friendlyName;
    }.bind(this);

    playerTarget.setVolume = function (volumeSliderPosition) {
        // Add resistance to avoid loud volume
        var currentVolume = this.remotePlayer.volumeLevel;
        var p = document.getElementById('audio_bg_level');
        if (volumeSliderPosition < FULL_VOLUME_HEIGHT) {
            var vScale =  this.currentVolume * FULL_VOLUME_HEIGHT;
            if (volumeSliderPosition > vScale) {
                volumeSliderPosition = vScale + (pos - vScale) / 2;
            }
            p.style.height = volumeSliderPosition + 'px';
            p.style.marginTop = -volumeSliderPosition + 'px';
            currentVolume = volumeSliderPosition / FULL_VOLUME_HEIGHT;
        } else {
            currentVolume = 1;
        }
        this.remotePlayer.volumeLevel = currentVolume;
        this.remotePlayerController.setVolumeLevel();
    }.bind(this);

    playerTarget.mute = function () {
        if (!this.remotePlayer.isMuted) {
            this.remotePlayerController.muteOrUnmute();
        }
    }.bind(this);

    playerTarget.unMute = function () {
        if (this.remotePlayer.isMuted) {
            this.remotePlayerController.muteOrUnmute();
        }
    }.bind(this);

    playerTarget.isMuted = function() {
        return this.remotePlayer.isMuted;
    }.bind(this);

    playerTarget.seekTo = function (time) {
        this.remotePlayer.currentTime = time;
        this.remotePlayerController.seek();
    }.bind(this);

    this.playerHandler.setTarget(playerTarget);

    // Setup remote player volume right on setup
    // The remote player may have had a volume set from previous playback
    if (this.remotePlayer.isMuted) {
        this.playerHandler.mute();
    }
    var currentVolume = this.remotePlayer.volumeLevel * FULL_VOLUME_HEIGHT;
    var p = document.getElementById('audio_bg_level');
    p.style.height = currentVolume + 'px';
    p.style.marginTop = -currentVolume + 'px';

    this.hideFullscreenButton();

    this.playerHandler.play();
};

/**
 * Callback when media is loaded in local player
 */
CastPlayer.prototype.onMediaLoadedLocally = function() {
    var localPlayer = document.getElementById('video_element');
    localPlayer.currentTime = this.currentMediaTime;

    this.playerHandler.loaded();
};

/**
 * Select a media content
 * @param {number} mediaIndex A number for media index
 */
CastPlayer.prototype.selectMedia = function() {
    // Reset progress bar
    var pi = document.getElementById('progress_indicator');
    var p = document.getElementById('progress');
    p.style.width = '0px';
    pi.style.marginLeft = -21 - PROGRESS_BAR_WIDTH + 'px';

    // Reset currentMediaTime
    this.currentMediaTime = 0;

    this.playerState = PLAYER_STATE.IDLE;
    this.playerHandler.play();
};

/**
 * Media seek function
 * @param {Event} event An event object from seek
 */
CastPlayer.prototype.seekMedia = function(event) {
    var pos = parseInt(event.offsetX, 10);
    var pi = document.getElementById('progress_indicator');
    var p = document.getElementById('progress');
    if (event.currentTarget.id == 'progress_indicator') {
        var curr = parseInt(
            this.currentMediaTime + this.currentMediaDuration * pos /
            PROGRESS_BAR_WIDTH, 10);
        var pp = parseInt(pi.style.marginLeft, 10) + pos;
        var pw = parseInt(p.style.width, 10) + pos;
    } else {
        var curr = parseInt(
            pos * this.currentMediaDuration / PROGRESS_BAR_WIDTH, 10);
        var pp = pos - 21 - PROGRESS_BAR_WIDTH;
        var pw = pos;
    }

    if (this.playerState === PLAYER_STATE.PLAYING ||
        this.playerState === PLAYER_STATE.PAUSED) {
        this.currentMediaTime = curr;
        p.style.width = pw + 'px';
        pi.style.marginLeft = pp + 'px';
    }

    this.playerHandler.seekTo(curr);
};

/**
 * Set current player volume
 * @param {Event} mouseEvent
 */
CastPlayer.prototype.setVolume = function(mouseEvent) {
    var p = document.getElementById('audio_bg_level');
    var pos = 0;
    if (mouseEvent.currentTarget.id === 'audio_bg_track') {
        pos = FULL_VOLUME_HEIGHT - parseInt(mouseEvent.offsetY, 10);
    } else {
        pos = parseInt(p.clientHeight, 10) - parseInt(mouseEvent.offsetY, 10);
    }
    this.playerHandler.setVolume(pos);
};

/**
 * Starts the timer to increment the media progress bar
 */
CastPlayer.prototype.startProgressTimer = function() {
    this.stopProgressTimer();

    // Start progress timer
    this.timer =
        setInterval(this.incrementMediaTimeHandler, TIMER_STEP);
};

/**
 * Stops the timer to increment the media progress bar
 */
CastPlayer.prototype.stopProgressTimer = function() {
    if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
    }
};

/**
 * Helper function
 * Increment media current position by 1 second
 */
CastPlayer.prototype.incrementMediaTime = function() {
    // First sync with the current player's time
    this.currentMediaTime = this.playerHandler.getCurrentMediaTime();
    this.currentMediaDuration = this.playerHandler.getMediaDuration();

    if (this.playerState === PLAYER_STATE.PLAYING) {
        if (this.currentMediaTime < this.currentMediaDuration) {
            this.currentMediaTime += 1;
            this.updateProgressBarByTimer();
        } else {
            this.endPlayback();
        }
    }
};

/**
 * Update progress bar based on timer
 */
CastPlayer.prototype.updateProgressBarByTimer = function() {
    var p = document.getElementById('progress');
    if (isNaN(parseInt(p.style.width, 10))) {
        p.style.width = 0;
    }
    if (this.currentMediaDuration > 0) {
        var pp = Math.floor(
            PROGRESS_BAR_WIDTH * this.currentMediaTime / this.currentMediaDuration);
    }

    p.style.width = pp + 'px';
    var pi = document.getElementById('progress_indicator');
    pi.style.marginLeft = -21 - PROGRESS_BAR_WIDTH + pp + 'px';

    if (pp >= PROGRESS_BAR_WIDTH) {
        this.endPlayback();
    }
};

/**
 *  End playback. Called when media ends.
 */
CastPlayer.prototype.endPlayback = function() {
    this.currentMediaTime = 0;
    this.stopProgressTimer();
    this.playerState = PLAYER_STATE.IDLE;
    this.playerHandler.updateDisplayMessage();

    document.getElementById('play').style.display = 'block';
    document.getElementById('pause').style.display = 'none';
};

/**
 * @param {number} durationInSec
 * @return {string}
 */
CastPlayer.getDurationString = function(durationInSec) {
    var durationString = '' + Math.floor(durationInSec % 60);
    var durationInMin = Math.floor(durationInSec / 60);
    if (durationInMin === 0) {
        return durationString;
    }
    durationString = (durationInMin % 60) + ':' + durationString;
    var durationInHour = Math.floor(durationInMin / 60);
    if (durationInHour === 0) {
        return durationString;
    }
    return durationInHour + ':' + durationString;
};

/**
 * Updates media duration text in UI
 */
CastPlayer.prototype.updateMediaDuration = function() {
    document.getElementById('duration').innerHTML =
        CastPlayer.getDurationString(this.currentMediaDuration);
};

/**
 * Request full screen mode
 */
CastPlayer.prototype.requestFullScreen = function() {
    // Supports most browsers and their versions.
    var element = document.getElementById('video_element');
    var requestMethod =
        element['requestFullScreen'] || element['webkitRequestFullScreen'];

    if (requestMethod) { // Native full screen.
        requestMethod.call(element);
        console.log('Requested fullscreen');
    }
};


/**
 * Exit full screen mode
 */
CastPlayer.prototype.cancelFullScreen = function() {
    // Supports most browsers and their versions.
    var requestMethod =
        document['cancelFullScreen'] || document['webkitCancelFullScreen'];

    if (requestMethod) {
        requestMethod.call(document);
    }
};


/**
 * Exit fullscreen mode by escape
 */
CastPlayer.prototype.fullscreenChangeHandler = function() {
    this.fullscreen = !this.fullscreen;
};

CastPlayer.prototype.castNow = function(event) {
  event.preventDefault();
  this.selectMedia();
};


/**
 * Show expand/collapse fullscreen button
 */
CastPlayer.prototype.showFullscreenButton = function() {
    if (this.fullscreen) {
        document.getElementById('fullscreen_expand').style.display = 'none';
        document.getElementById('fullscreen_collapse').style.display = 'block';
    } else {
        document.getElementById('fullscreen_expand').style.display = 'block';
        document.getElementById('fullscreen_collapse').style.display = 'none';
    }
};


/**
 * Hide expand/collapse fullscreen button
 */
CastPlayer.prototype.hideFullscreenButton = function() {
    document.getElementById('fullscreen_expand').style.display = 'none';
    document.getElementById('fullscreen_collapse').style.display = 'none';
};

/**
 * Show the media control
 */
CastPlayer.prototype.showMediaControl = function() {
    document.getElementById('media_control').style.opacity = 0.7;
};


/**
 * Hide the media control
 */
CastPlayer.prototype.hideMediaControl = function() {
    document.getElementById('media_control').style.opacity = 0;
};


/**
 * Show the volume slider
 */
CastPlayer.prototype.showVolumeSlider = function() {
    if (!this.playerHandler.isMuted()) {
        document.getElementById('audio_bg').style.opacity = 1;
        document.getElementById('audio_bg_track').style.opacity = 1;
        document.getElementById('audio_bg_level').style.opacity = 1;
        document.getElementById('audio_indicator').style.opacity = 1;
    }
};

/**
 * Hide the volume slider
 */
CastPlayer.prototype.hideVolumeSlider = function() {
    document.getElementById('audio_bg').style.opacity = 0;
    document.getElementById('audio_bg_track').style.opacity = 0;
    document.getElementById('audio_bg_level').style.opacity = 0;
    document.getElementById('audio_indicator').style.opacity = 0;
};

/**
 * Reset the volume slider
 */
CastPlayer.prototype.resetVolumeSlider = function() {
    var volumeTrackHeight = document.getElementById('audio_bg_track').clientHeight;
    var defaultVolumeSliderHeight = DEFAULT_VOLUME * volumeTrackHeight;
    document.getElementById('audio_bg_level').style.height =
        defaultVolumeSliderHeight + 'px';
    document.getElementById('audio_on').style.display = 'block';
    document.getElementById('audio_off').style.display = 'none';
};

/**
 * Initialize UI components and add event listeners
 */
CastPlayer.prototype.initializeUI = function() {
    // Add event handlers to UI components
    document.getElementById('progress_bg').addEventListener(
        'click', this.seekMedia.bind(this));
    document.getElementById('progress').addEventListener(
        'click', this.seekMedia.bind(this));
    document.getElementById('progress_indicator').addEventListener(
       'dragend', this.seekMedia.bind(this));
    document.getElementById('audio_on').addEventListener(
        'click', this.playerHandler.mute.bind(this.playerHandler));
    document.getElementById('audio_off').addEventListener(
        'click', this.playerHandler.unMute.bind(this.playerHandler));
    document.getElementById('audio_bg').addEventListener(
        'mouseover', this.showVolumeSlider.bind(this));
    document.getElementById('audio_on').addEventListener(
        'mouseover', this.showVolumeSlider.bind(this));
    document.getElementById('audio_bg_level').addEventListener(
        'mouseover', this.showVolumeSlider.bind(this));
    document.getElementById('audio_bg_track').addEventListener(
        'mouseover', this.showVolumeSlider.bind(this));
    document.getElementById('audio_bg_level').addEventListener(
        'click', this.setVolume.bind(this));
    document.getElementById('audio_bg_track').addEventListener(
        'click', this.setVolume.bind(this));
    document.getElementById('audio_bg').addEventListener(
        'mouseout', this.hideVolumeSlider.bind(this));
    document.getElementById('audio_on').addEventListener(
        'mouseout', this.hideVolumeSlider.bind(this));
    document.getElementById('media_control').addEventListener(
        'mouseover', this.showMediaControl.bind(this));
    document.getElementById('media_control').addEventListener(
        'mouseout', this.hideMediaControl.bind(this));
    document.getElementById('fullscreen_expand').addEventListener(
        'click', this.requestFullScreen.bind(this));
    document.getElementById('fullscreen_collapse').addEventListener(
        'click', this.cancelFullScreen.bind(this));
    document.getElementById('playform').addEventListener(
       'submit', this.castNow.bind(this), true);
    document.addEventListener(
        'fullscreenchange', this.fullscreenChangeHandler.bind(this), false);
    document.addEventListener(
        'webkitfullscreenchange', this.fullscreenChangeHandler.bind(this), false);

    // Enable play/pause buttons
    document.getElementById('play').addEventListener(
        'click', this.playerHandler.play.bind(this.playerHandler));
    document.getElementById('pause').addEventListener(
        'click', this.playerHandler.pause.bind(this.playerHandler));
    document.getElementById('progress_indicator').draggable = true;
};

/**
 * Makes human-readable message from chrome.cast.Error
 * @param {chrome.cast.Error} error
 * @return {string} error message
 */
CastPlayer.getErrorMessage = function(error) {
    switch (error.code) {
        case chrome.cast.ErrorCode.API_NOT_INITIALIZED:
            return 'The API is not initialized.' +
                (error.description ? ' :' + error.description : '');
        case chrome.cast.ErrorCode.CANCEL:
            return 'The operation was canceled by the user' +
                (error.description ? ' :' + error.description : '');
        case chrome.cast.ErrorCode.CHANNEL_ERROR:
            return 'A channel to the receiver is not available.' +
                (error.description ? ' :' + error.description : '');
        case chrome.cast.ErrorCode.EXTENSION_MISSING:
            return 'The Cast extension is not available.' +
                (error.description ? ' :' + error.description : '');
        case chrome.cast.ErrorCode.INVALID_PARAMETER:
            return 'The parameters to the operation were not valid.' +
                (error.description ? ' :' + error.description : '');
        case chrome.cast.ErrorCode.RECEIVER_UNAVAILABLE:
            return 'No receiver was compatible with the session request.' +
                (error.description ? ' :' + error.description : '');
        case chrome.cast.ErrorCode.SESSION_ERROR:
            return 'A session could not be created, or a session was invalid.' +
                (error.description ? ' :' + error.description : '');
        case chrome.cast.ErrorCode.TIMEOUT:
            return 'The operation timed out.' +
                (error.description ? ' :' + error.description : '');
    }
};

/**
 * Hardcoded media json objects
 */
var mediaJSON = { 'categories' : [{ 'name' : 'Movies',
    'videos' : [
        { 'description' : "Big Buck Bunny tells the story of a giant rabbit with a heart bigger than himself. When one sunny day three rodents rudely harass him, something snaps... and the rabbit ain't no bunny anymore! In the typical cartoon tradition he prepares the nasty rodents a comical revenge.\n\nLicensed under the Creative Commons Attribution license\nhttp://www.bigbuckbunny.org",
          'sources' : ['http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'],
          'subtitle' : 'By Blender Foundation',
          'thumb' : 'images/BigBuckBunny.jpg',
          'title' : 'Big Buck Bunny'
        },
        // Prod
        { 'description' : 'Peck Sample',
          'sources' : ['https://manifest.prod.boltdns.net/manifest/v1/dash/live-timeline/bccenc/4590388345001/53f6f36b-d2b4-4bf9-926f-15440f16a293/2s/manifest.mpd?fastly_token=NTlhODVmMjVfZWI4NmMyZjlkODcxZDMxOTU3ZGIzYjVmMzUxMzA3YjcwMmQ0NzRkZDc4MzlhYjExNDJmOTAzMmVlODIyMzQ2Yg%3D%3D'],
          'subtitle' : 'Bolt bccenc',
          'thumb' : 'images/ElephantsDream.jpg',
          'title' : 'Bolt BCCENC Sintel'
        },
        { 'description' : 'Peck Sample',
          'sources' : ['https://ssaiplayback.prod.boltdns.net/playback/once/v1/dash/live-timeline/bccenc/4590388345001/e6fcc587-b64a-4a25-a0e2-d5ece9738c53/53f6f36b-d2b4-4bf9-926f-15440f16a293/manifest.mpd?bc_token=NTlhODViYThfOTE2OGZmNDc4Y2I3YzE0Y2FhMmI2Y2VhYzlhMGVlMjMzMTlmNmE1OGQ1NDk3NTVjNjgxMDUyZGUxMTU3MmQ4Mw%3D%3D'],
          'subtitle' : 'Bolt bccenc',
          'thumb' : 'images/ElephantsDream.jpg',
          'title' : 'Bolt SSAI BCCENC Sintel'
        },
    ]}]};
