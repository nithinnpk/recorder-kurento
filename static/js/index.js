var currentpage = 1;
var socket = io.connect(node_url);
var time = 0;
var recorder = null;
var webRtc   = null;
var pipelinethis = null;
function checkTime(){
    
      var vid = document.getElementById("videoInput");
      if(vid!=null)
      {
        streamTime = vid.currentTime;
        //$(".current-time").html(secondsToHms(streamTime.toFixed(0)));
        time = streamTime.toFixed(0);
      }
      setTimeout(checkTime,500);
      

}
socket.on("connect", function (id) {

});

function removeAllDataOnInit(){
   var path                =  'static/json/'+streamName;
  socket.emit("removeAllDataOnInit",path);
  saveSlide(currentpage+'.png');
}
function getSlideDetails(){
   socket.emit("getSlideDetails",pptserverpath);
}
function saveSlide(filename){
  //var url      = $('#currentSlide').attr('src');
  //var filename = url.substring(url.lastIndexOf('/')+1);
  var data                = {};
      data['name']        = filename;
      data                = JSON.stringify(data);
  var path                =  'static/json/'+streamName+'/'+time+'.json';
  //alert(data+'---'+path);
  socket.emit("saveSlide", data,path);
}
$('document').ready(function(){
     
     checkTime();
   
     if(ppt != 0){
          $('#next').show();
          $('#previous').show();
           $('#page-no').show();

     }
      $('#next').click(function(){
        if(currentpage < totalpage){
           currentpage++;
           $('#currentSlide').attr('src',pptRoot+currentpage+'.png');
           saveSlide(currentpage+'.png');
           parent.onCurrentPage(currentpage);
        }
         
      })
      $('#previous').click(function(){

           if(currentpage > 1){
              currentpage--;
              $('#currentSlide').attr('src',pptRoot+currentpage+'.png');
              saveSlide(currentpage+'.png');
              parent.onCurrentPage(currentpage);
          }
      })

});

function getopts(args, opts)
{
  var result = opts.default || {};
  args.replace(
      new RegExp("([^?=&]+)(=([^&]*))?", "g"),
      function($0, $1, $2, $3) { result[$1] = decodeURI($3); });

  return result;
};

var args = getopts(location.search,
{
  default:
  {
    ws_uri: kurentoUrl,
    file_uri: 'file:///'+recordpath, // file to be stored in media server
    ice_servers: undefined
  }
});

function setIceCandidateCallbacks(webRtcPeer, webRtcEp, onerror)
{
  webRtcPeer.on('icecandidate', function(candidate) {
    console.log("Local candidate:",candidate);

    candidate = kurentoClient.register.complexTypes.IceCandidate(candidate);

    webRtcEp.addIceCandidate(candidate, onerror)
  });

  webRtcEp.on('OnIceCandidate', function(event) {
   
    var candidate = event.candidate;

    console.log("Remote candidate:",candidate);

    webRtcPeer.addIceCandidate(candidate, onerror);
  });
}


window.addEventListener('load', function(event) {
  var startRecordButton = document.getElementById('start');
  startRecordButton.addEventListener('click', startRecording);
  
});

function startRecording() {
  
 removeAllDataOnInit();
 document.getElementById("videoInput").controls = true;
  var startRecordButton = document.getElementById('start');
  startRecordButton.style.display = 'none';
  var videoInput = document.getElementById("videoInput");
  
  showSpinner();

  var stopRecordButton = document.getElementById("stop")
  displayNoneAll();
  stopRecordButton.style.display = 'block';
  var options = {
    localVideo: videoInput,
    remoteVideo: null
  };

  if (args.ice_servers) {
    console.log("Use ICE servers: " + args.ice_servers);
    options.configuration = {
      iceServers : JSON.parse(args.ice_servers)
    };
  } else {
    console.log("Use freeice")
  }

  webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function(error)
  {
    if(error) return onError(error)

    this.generateOffer(onOffer)
  });

  function onOffer(error, offer) {
    if (error) return onError(error);

    console.log("Offer...");

    kurentoClient(args.ws_uri, function(error, client) {
      if (error) return onError(error);

      client.create('MediaPipeline', function(error, pipeline) {
        if (error) return onError(error);

        console.log("Got MediaPipeline");
        if(ppt != '0' || video == '0'){
		var elements =
		[
		  {type: 'RecorderEndpoint', params: {uri : args.file_uri,mediaProfile:'WEBM_AUDIO_ONLY'}},
		  {type: 'WebRtcEndpoint', params: {}}
		]
        }else{
                var elements =
		[
		  {type: 'RecorderEndpoint', params: {uri : args.file_uri}},
		  {type: 'WebRtcEndpoint', params: {}}
		]
        }
       //alert(JSON.stringify(elements[0]));        
        pipelinethis = pipeline;
        pipeline.create(elements, function(error, elements){
          if (error) return onError(error);

          recorder = elements[0]
          webRtc   = elements[1]

          setIceCandidateCallbacks(webRtcPeer, webRtc, onError)

          webRtc.processOffer(offer, function(error, answer) {
            if (error) return onError(error);

            console.log("offer");

            webRtc.gatherCandidates(onError);
            webRtcPeer.processAnswer(answer);
          });

          client.connect(webRtc, webRtc, recorder, function(error) {
            if (error) return onError(error);

            console.log("Connected");

            recorder.record(function(error) {
              if (error) return onError(error);

              console.log("record");

              stopRecordButton.addEventListener("click", function(event){
                 if(totalTimeAv == '0'){
                    stopRecording();
                 }else{
                    timelimit = 0;
                 }
                
              })
            });
          });
        });
      });
    });
  }
}
function stopRecording(){
  document.getElementById("videoInput").controls = false;
                recorder.stop();
                pipelinethis.release();
                webRtcPeer.dispose();
                videoInput.src = "";
                hideSpinner();

                var playButton = document.getElementById('play');
                playButton.addEventListener('click', startPlaying);
                displayNoneAll();
                playButton.style.display = 'block';
}
function displayNoneAll(){
  var startRecordButton = document.getElementById('start');
  startRecordButton.style.display = 'none';
  var stopRecordButton = document.getElementById('stop');
  stopRecordButton.style.display = 'none';
  var playButton = document.getElementById('play');
  playButton.style.display = 'none';
  var reset = document.getElementById('reset');
  reset.style.display = 'none';
  $('#save').hide();
  $('#delete').hide();
}
var playenable = 0;
function resetRecording(){
  hideSpinner();
  playenable = 0;
  document.getElementById("videoInput").controls = false;
  document.getElementById("videoInput").removeAttribute("src");
  displayNoneAll();
  //document.getElementById("videoInput").controls = false;
  var startRecordButton = document.getElementById('start');
  startRecordButton.style.display = 'block';
  
  socket.emit("delteFile",recordpath);
}

function startPlaying()
{
    playenable = 1;
    console.log("Start playing");
    document.getElementById("videoInput").controls = true;
    var playButton = document.getElementById('play');
    playButton.style.display = 'none';
    var resetButton = document.getElementById('reset');
    displayNoneAll();
    var saveBut = document.getElementById('save');
    saveBut.style.display = 'block';
    var delBut = document.getElementById('delete');
    delBut.style.display = 'block';
    resetButton.style.display = 'block';
    resetButton.addEventListener('click', resetRecording);
    delBut.addEventListener('click', resetRecording);
    var videoPlayer = document.getElementById('videoInput');
    showSpinner();
    videoPlayer.setAttribute("src", playbacpath);
    if(playback == '0'){
        videoPlayer.play();
    }
    
    videoPlayer.volume = 1;
    
    videoPlayer.onloadstart = function() {
        //showSpinner();
    };
    videoPlayer.onwaiting = function() {
       // showSpinner();
    };
    videoPlayer.onplaying = function(){
        //hideSpinner();
    };
}
function startPlayingFromKurento()
{
  console.log("Start playing");

  document.getElementById("videoInput").controls = true;
  var playButton = document.getElementById('play');
  playButton.style.display = 'none';
  var resetButton = document.getElementById('reset');
  displayNoneAll();
  resetButton.style.display = 'block';
  
  resetButton.addEventListener('click', resetRecording);
  var videoPlayer = document.getElementById('videoInput');
  showSpinner();

  var options = {
    remoteVideo: videoPlayer
  };

  if (args.ice_servers) {
    console.log("Use ICE servers: " + args.ice_servers);
    options.configuration = {
      iceServers : JSON.parse(args.ice_servers)
    };
  } else {
    console.log("Use freeice")
  }

  var webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options,
  function(error)
  {
    if(error) return onError(error)

    this.generateOffer(onPlayOffer)
  });

  function onPlayOffer(error, offer) {
    if (error) return onError(error);

    kurentoClient(args.ws_uri, function(error, client) {
      if (error) return onError(error);

      client.create('MediaPipeline', function(error, pipeline) {
        if (error) return onError(error);

        pipeline.create('WebRtcEndpoint', function(error, webRtc) {
          if (error) return onError(error);

          setIceCandidateCallbacks(webRtcPeer, webRtc, onError)

          webRtc.processOffer(offer, function(error, answer) {
            if (error) return onError(error);

            webRtc.gatherCandidates(onError);

            webRtcPeer.processAnswer(answer);
          });

          var options = {uri : args.file_uri}

          pipeline.create("PlayerEndpoint", options, function(error, player) {
            if (error) return onError(error);

            player.on('EndOfStream', function(event){
              pipeline.release();
              videoPlayer.src = "";

              hideSpinner();
            });

            player.connect(webRtc, function(error) {
              if (error) return onError(error);

              player.play(function(error) {
                if (error) return onError(error);
                console.log("Playing ...");
              });
            });

            document.getElementById("stop").addEventListener("click",
            function(event){
              document.getElementById("videoInput").controls = false;
              pipeline.release();
              webRtcPeer.dispose();
              videoPlayer.src="";

              hideSpinner();

            })
          });
        });
      });
    });
  };
}

function onError(error) {
  if(error) console.log(error);
}

function showSpinner() {
    var videl = document.getElementById("videoInput"); 
    videl.poster = 'img/transparent-1px.png';
    videl.style.background = "center transparent url('img/connecting.gif') no-repeat";
}

function hideSpinner() {
    var videl = document.getElementById("videoInput"); 
    videl.src = '';
    videl.poster = 'img/record.jpg';
    videl.style.background = '';
  
}

/**
 * Lightbox utility (to display media pipeline image in a modal dialog)
 */
$(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
  event.preventDefault();
  $(this).ekkoLightbox();
});
/*
*/
if(ppt != '0')
{
  getStreamTime();
}

function getStreamTime()
{
    if(playenable == 1){
      var vid = document.getElementById("videoInput");
      if(vid!=null)
      {
        streamTime = vid.currentTime;
        totalTime = vid.duration;
        checkObject(parseInt(streamTime));      
      }
    }
      
    setTimeout(getStreamTime,50);
}

/* 
   Section for loading cue point data
*/
var fetchtime = -1;
function checkObject(time)
{
    if(time == 1){
       time = 0;
    }
    var time=parseInt(time);
    if(time!=fetchtime)
    {
      fetchtime = time;
      time = time;
      var jsonpath = jsonRoot+time+".json";
      var xmlhttp = new XMLHttpRequest();

xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
          var jsonData = xmlhttp.responseText;
          var jsonObj  = JSON.parse(jsonData);
          var slide = document.getElementById('currentSlide');
          slide.setAttribute("src", pptRoot+jsonObj['name']);
      }
};
xmlhttp.open("GET", jsonpath, true);
xmlhttp.send();

    }
   
 }

 function secondsToHms(d) 
{
  d = Number(d);
  var h = Math.floor(d / 3600);
  var m = Math.floor(d % 3600 / 60);
  var s = Math.floor(d % 3600 % 60);
  return ((h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s); 
}
