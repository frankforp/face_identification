var keyevent =false
var faceareas =[0,0,0,0]

let videoWidth, videoHeight;
let qvga = {width: {exact: 320}, height: {exact: 320}};
let vga = {width: {exact: 450}, height: {exact: 450}};
let resolution = window.innerWidth < 640 ? qvga : vga;
// whether streaming video from the camera.
let streaming = false;

let video = document.getElementById('video');
let canvasOutput = document.getElementById('canvasOutput');
let canvasOutputCtx = canvasOutput.getContext('2d');
let stream = null;

let detectFace = document.getElementById('face');
let info = document.getElementById('info');

function startCamera() {
  console.log("startCamera")
  if (streaming) return;
  navigator.mediaDevices.getUserMedia({video: resolution, audio: false})
    .then(function(s) {
    stream = s;
    video.srcObject = s;
    video.play();
  })
    .catch(function(err) {
    console.log("An error occured! " + err);
  });

  video.addEventListener("canplay", function(ev){
    if (!streaming) {
      videoWidth = video.videoWidth;
      videoHeight = video.videoHeight;
      video.setAttribute("width", videoWidth);
      video.setAttribute("height", videoHeight);
      canvasOutput.width = videoWidth;
      canvasOutput.height = videoHeight;
      streaming = true;
    }
    startVideoProcessing();
  }, false);
}

let faceClassifier = null;

let src = null;
let dstC1 = null;
let dstC3 = null;
let dstC4 = null;

let canvasInput = null;
let canvasInputCtx = null;

function startVideoProcessing() {

  console.log("startVideoProcessing")
  info.innerHTML = 'Please Look At The Camera!';
  if (!streaming) { console.warn("Please startup your webcam"); return; }  
  //stopVideoProcessing();  
  canvasInput = document.createElement('canvas');
  canvasInput.width = videoWidth;
  canvasInput.height = videoHeight;
  canvasInputCtx = canvasInput.getContext('2d');  
 
  srcMat = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC4);
  grayMat = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC1);
  
  faceClassifier = new cv.CascadeClassifier();
  faceClassifier.load('haarcascade_frontalface_default.xml');
  requestAnimationFrame(processVideo);
}

function processVideo() {

  //console.log("processVideo")
  //stats.begin();
  canvasInputCtx.drawImage(video, 0, 0, videoWidth, videoHeight);
  let imageData = canvasInputCtx.getImageData(0, 0, videoWidth, videoHeight);
  srcMat.data.set(imageData.data);
  cv.cvtColor(srcMat, grayMat, cv.COLOR_RGBA2GRAY); ////RGB转GRAY
  let faces = [];
  let size;
  if (detectFace.checked) {
    let faceVect = new cv.RectVector();
    let faceMat = new cv.Mat();
    cv.pyrDown(grayMat, faceMat);
    if (videoWidth > 320)
      cv.pyrDown(faceMat, faceMat);
    size = faceMat.size();
    faceClassifier.detectMultiScale(faceMat, faceVect);
    for (let i = 0; i < faceVect.size(); i++) {
      let face = faceVect.get(i);
      faces.push(new cv.Rect(face.x-5, face.y-16, face.width+10, face.height+20));
    }
    faceMat.delete();
    faceVect.delete();
  } else {
   console.log("detectFace unchecked")
  }
  canvasOutputCtx.drawImage(canvasInput, 0, 0, videoWidth, videoHeight);
  drawResults(canvasOutputCtx, faces, 'white', size, keyevent);
  //console.log(faces)
  //stats.end();

  requestAnimationFrame(processVideo);
}

function convertCanvasToImage(canvas) {
  var image = new Image();
  image.src = canvas.toDataURL("image/png");
  return image;
}

function downloadFile(fileName, content) {
  let aLink = document.createElement('a');
  let blob = this.base64ToBlob(content);
  let evt = document.createEvent("HTMLEvents");
  evt.initEvent("click", true, true);
  aLink.download = fileName;
  aLink.href = URL.createObjectURL(blob);
  aLink.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));//兼容火狐
}

//base64转blob
function base64ToBlob(code) {
  let parts = code.split(';base64,');
  let contentType = parts[0].split(':')[1];
  let raw = window.atob(parts[1]);
  let rawLength = raw.length;
  let uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], {type: contentType});
}

document.onkeydown=function(event){
    var e = event || window.event || arguments.callee.caller.arguments[0];
    if(e && e.keyCode==32){ // space
        keyevent = true   
        var clip = document.getElementById('clip');
        var context_clip = clip.getContext('2d');
        var org = document.getElementById('canvasOutput')
        var org_org = org.getContext('2d')
        clip.height = clip.height;

        var clipImg = org_org.getImageData(faceareas[0],faceareas[1],faceareas[2],faceareas[3])
        var m_data = Uint8ClampedArray.from(clipImg.data)
        var m_imageData = new ImageData(m_data,clipImg.width,clipImg.height);
        var x_r = (300-m_imageData.width)/2
        var y_r = (300-m_imageData.height)/2
        context_clip.putImageData(m_imageData,x_r,y_r);
        
        //save canvas
        var myCanvas = document.getElementById("clip");
        var image = myCanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");   
        //console.log(image)
        let imgData = image;
        downloadFile('face.png', imgData);
      }         

     if(e && e.keyCode==13){ // enter
        keyevent = false //continue
        var clip = document.getElementById('clip');
        var context_clip = clip.getContext('2d');
        clip.height = clip.height;
        alert("Press Enter to continue taking photo ")
    }
};

function drawResults(ctx, results, color, size, keyevent) {
  //console.log("drawResults")
  faceareas=[0,0,0,0]
  if(keyevent ==false) {
      for (let i = 0; i < results.length; ++i) {
      let rect = results[i];
      let xRatio = videoWidth/size.width;
      let yRatio = videoHeight/size.height;
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.strokeRect(rect.x*xRatio, rect.y*yRatio, rect.width*xRatio, rect.height*yRatio);
      faceareas=[rect.x*xRatio, rect.y*yRatio, rect.width*xRatio, rect.height*yRatio]
    }
  }
}

function stopVideoProcessing() {
  console.log(">>>stopVideoProcessing")
  if (src != null && !src.isDeleted()) src.delete();
  if (dstC1 != null && !dstC1.isDeleted()) dstC1.delete();
  if (dstC3 != null && !dstC3.isDeleted()) dstC3.delete();
  if (dstC4 != null && !dstC4.isDeleted()) dstC4.delete();
}

function stopCamera() {
  console.log("stopCamera")
  if (!streaming) return;
  stopVideoProcessing();
  document.getElementById("canvasOutput").getContext("2d").clearRect(0, 0, width, height);
  video.pause();
  video.srcObject=null;
  stream.getVideoTracks()[0].stop();
  streaming = false;
}

function initUI() {
  console.log("initUI")
  //stats = new Stats();
  //stats.showPanel(0);
  //document.getElementById('container').appendChild(stats.dom);
}

function opencvIsReady() {
  console.log("opencvIsReady")
  if (!featuresReady) {
    console.log('Requred features are not ready.');
    return;
  }
  info.innerHTML = 'Camera Is Being Prepared...';
  $("#loading").empty();
  initUI();
  startCamera();
}

$("#btnClick").click(function () {
    var formData = new FormData();
    formData.append("file", $("#userface")[0].files[0]);
    $.ajax({
        url: 'http://10.48.5.64:8090/api/v1/files/E61169299',
        //timeout : 100000,
        type: 'post',
        data: formData,
        processData: false,
        contentType: false,
        beforeSend: function () {
            console.log("submit the face to be certified")
            $("#loading").html("<img src='js/loading.gif' />");
        },
        success: function (data) {
            console.log(data.result)
            $("#loading").empty();
            if(data.result=="Same Person"){
              $("#loading").css("color","green");
            }else{
              $("#loading").css("color","red");
            }
            $("#loading").html(data.result);
        },
        error: function (e)
        {
            console.log(e);
        },
        complete: function () {
          console.log("return successfully")
       }
    });
});

$("#idClick").click(function () {
    var formData = new FormData();
    formData.append("file", $("#userface")[0].files[0]);
    $.ajax({
        url: 'http://10.48.5.64:8090/api/v1/files',
        type: 'post',
        data: formData,
        processData: false,
        contentType: false,
        beforeSend: function () {
            $("#loading").html("<img src='js/loading.gif' />");
        },
        success: function (data) {
            console.log(data.passportNo)
            $("#loading").empty();
            $("#loading").css("color","");
            $("#loading").html(data.passportNo);
        },
        error: function (e)
        {
            console.log(e);
        }
    });
});

function preview(file) {
    var prevDiv = document.getElementById('preview');
    if (file.files && file.files[0]) {
        var reader = new FileReader();
        reader.onload = function (evt) {
            prevDiv.innerHTML = '<img width="400" height="430" src="' + evt.target.result + '" />';
        }
        reader.readAsDataURL(file.files[0]);
    } else {
        prevDiv.innerHTML = '<div class="img" style="filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(sizingMethod=scale,src=\'' + file.value + '\'"></div>';
    }
}