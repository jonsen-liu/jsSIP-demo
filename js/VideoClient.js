/**
 * Created by Administrator on 2017/11/6.
 */
var audio = new Audio();//音频
var timeAudio;//音频定时器


var outgoingSession = null;
var incomingSession = null;
var currentSession = null;

var calling = document.getElementsByClassName("calling")[0];
var header = document.getElementById("header");
var login = document.getElementById("login");
var istrue = document.getElementById("istrue");//登陆页面的多选框勾选按钮
var footer = document.getElementById("footer");
// var repetition = document.getElementById("repetition");//退出会话确定页面
var headPortrait = document.getElementById("headPortrait");//头像
var username = document.getElementById("username");//用户姓名
var out = document.getElementById("out");//退出会话按钮
// var outing = document.getElementById("outing");//完全退出关闭页面按钮
// var going = document.getElementById("going");//从新连接按钮
var videoView = document.getElementById('videoView');
var videoView2 = document.getElementById('videoView2');

var sip_uri_;
var sip_password_ ;
var ws_uri_;
var sip_phone_number;

var constraints = {
    audio: true,
    video: true
};
URL = window.URL || window.webkitURL;

var localStream = null;
var userAgent = null;

function gotLocalMedia(stream) {//渲染视频的地方
    console.info('Received local media stream');
    localStream = stream;
    videoView.src = URL.createObjectURL(stream);
    testCall();
    // videoView.style.display="block";
}

function captureLocalMedia() {
    console.info('Requesting local video & audio');
    navigator.webkitGetUserMedia(constraints, gotLocalMedia, function(e){
        alert('getUserMedia() error: ' + e.name);
    });
}

function testStart(){
    var socket = new JsSIP.WebSocketInterface(ws_uri_);
    var configuration = {
        sockets: [ socket ],
        outbound_proxy_set: ws_uri_,
        uri: sip_uri_,
        password: sip_password_,
        register: true,
        session_timers: false,
        register_expires:900//注册时间秒为单位 900s==15m
    };

    userAgent = new JsSIP.UA(configuration);

    userAgent.on('registered', function(data){//初始化成功
        console.info("registered: ", data.response.status_code, ",", data.response.reason_phrase);
        headPortrait.src = "./img/face2.png";
        captureLocalMedia();
        calling.style.display="block"
    });

    userAgent.on('registrationFailed', function(data){
        console.log("registrationFailed, ", data);
    });

    userAgent.on('registrationExpiring', function(){
        console.warn("registrationExpiring");
    });

    userAgent.on('newRTCSession', function(data){
        console.info('onNewRTCSession: ', data);
        if(data.originator == 'remote'){ //incoming call
            console.info("incomingSession, answer the call");
            incomingSession = data.session;
            data.session.answer({'mediaConstraints' : { 'audio': true, 'video': true}, 'mediaStream': localStream});
        }else{
            console.info("outgoingSession");
            outgoingSession = data.session;
            outgoingSession.on('connecting', function(data){
                console.info('onConnecting - ', data.request);
                currentSession = outgoingSession;
                outgoingSession = null;
            });


            audio.pause();
            audio.src = "./sounds/ringback.ogg";// 去电播放音
            audio.play();
            timeAudio = setInterval(function () {
                audio.play();
            },2000)
        }
        data.session.on('accepted', function(data){//接受
            calling.style.display="none";
            clearInterval(timeAudio);
            audio.pause();
            audio.src = "./sounds/answered.mp3";// 去电播放音
            audio.play();

            console.info('onAccepted - ', data);
            videoView.style.display="block";
            videoView2.style.display="block";
            if(data.originator == 'remote' && currentSession == null){
                currentSession = incomingSession;
                incomingSession = null;
                console.info("setCurrentSession - ", currentSession);
            }
        });
        data.session.on('confirmed', function(data){
            console.info('onConfirmed - ', data);
            if(data.originator == 'remote' && currentSession == null){
                currentSession = incomingSession;
                incomingSession = null;
                console.info("setCurrentSession - ", currentSession);
            }
        });
        data.session.on('sdp', function(data){
            console.info('onSDP, type - ', data.type, ' sdp - ', data.sdp);
        });
        data.session.on('progress', function(data){
            console.info('onProgress - ', data.originator);
            if(data.originator == 'remote'){
                console.info('onProgress, response - ', data.response);
            }
        });
        data.session.on('ended', function (data) {//已建立的通话结束时
            console.info('ended - ', data);
            if (data.originator == "remote") {
                videoView2.style.display = "none";
                videoView.src="";
                videoView.style.display = "none";
            } else if (data.originator == "local") {
                videoView2.style.display = "none";
                videoView.src="";
                videoView.style.display = "none";
            }else {
                alert("系统挂断");
                videoView2.style.display = "none";
                videoView.src="";
                videoView.style.display = "none";
                location.replace(location);
            }
        });
        data.session.on('peerconnection', function(data){


            console.info('onPeerconnection - ', data.peerconnection);
            data.peerconnection.onaddstream = function(ev){//渲染对方视频
                console.info('onaddstream from remote - ', ev);
                videoView2.src = URL.createObjectURL(ev.stream);
            };
        });
    });

    userAgent.on('newMessage', function(data){
        if(data.originator == 'local'){
            console.info('onNewMessage , OutgoingRequest - ', data.request);
        }else{
            console.info('onNewMessage , IncomingRequest - ', data.request);
        }
    });

    console.info("call register");
    userAgent.start();
}

// Register callbacks to desired call events
var eventHandlers = {
    'progress': function(e) {
        console.log('call is in progress');

    },
    'failed': function(e) {
        console.log('call failed: ', e);
        calling.style.display="none";
        clearInterval(timeAudio);
        audio.pause();
        audio.src = "./sounds/rejected.mp3";
        audio.play();
        var Timeout =setTimeout(function () {
            audio.pause();
            Timeout=null;
        });
        videoView.src = "";
        footer.style.display="none";
        bg.style.display="block";
    },
    'ended': function(e) {//电话结束
        console.log('电话结束 : ', e);
        videoView.src = "";
        // videoView2.style.display="none";
        // videoView2.src = "";
        footer.style.display="none";
        bg.style.display="block";
    },
    'confirmed': function(e) {
        console.log('call confirmed');
    }
};

function testCall(){   //呼叫
    var sip_phone_number_ = document.getElementById("sip_phone_number").value.toString();

    var options = {
        'eventHandlers'    : eventHandlers,
        'mediaConstraints' : {
            'audio': false,
            'video': true
        },
        'mediaStream': localStream
    };

    outgoingSession = userAgent.call(sip_phone_number_, options);
}
bg.onclick=function () {
    this.style.display="none";
    header.style.display="block";
    var data = localStorage.getItem("MYdata");//取出localStorage数据
    if (data != null) {//如果有数据
        data = JSON.parse(data);
        sip_uri_=data.sip_uri;
        sip_password_=data.sip_password;
        ws_uri_=data.ws_uri;
        sip_phone_number=data.sip_phone_number;


        username.innerHTML=sip_uri_;

        istrue.checked = data.istrue;//保存设置是否勾选
        document.getElementById("sip_uri").value=data.sip_uri;
        document.getElementById("sip_password").value=data.sip_password;
        document.getElementById("ws_uri").value=data.ws_uri;
        document.getElementById("sip_phone_number").value=data.sip_phone_number;
        header.style.display="none";
        footer.style.display="block";
        testStart();
    }
};

login.onclick=function(){//新建会话

    sip_uri_ = document.getElementById("sip_uri").value.toString();
    sip_password_ = document.getElementById("sip_password").value.toString();
    ws_uri_ = document.getElementById("ws_uri").value.toString();
    sip_phone_number = document.getElementById("sip_phone_number").value.toString();
    headPortrait.src = "./img/face1.png";
    username.innerHTML=sip_uri_;
    header.style.display="none";
    footer.style.display="block";
    testStart();
    if (istrue.checked) {
        var obj = {
            "sip_uri": sip_uri_,
            "sip_password": sip_password_,
            "ws_uri": ws_uri_,
            "sip_phone_number": sip_phone_number,
            "istrue": istrue.checked
        };
        var toStr = JSON.stringify(obj);
        localStorage.setItem("MYdata", toStr);
        header.style.display = "none";
        footer.style.display = "block";
    } else {
        localStorage.clear();
    }
};

out.onclick=function () {//退出会话
    var options;
    userAgent.terminateSessions(options = null);
    var data = localStorage.getItem("MYdata");//取出localStorage数据
    // console.log(data);
    // debugger;
    data = JSON.parse(data);
    istrue.checked = data.istrue;//保存设置是否勾选
    document.getElementById("sip_uri").value=data.sip_uri;
    document.getElementById("sip_password").value=data.sip_password;
    document.getElementById("ws_uri").value=data.ws_uri;
    document.getElementById("sip_phone_number").value=data.sip_phone_number;
    localStorage.clear("MYdata");
};
// going.onclick=function () {//从新开始会话
//     bg.style.display="none";
//     footer.style.display="block";
//     testStart()
// };
// outing.onclick=function () {//完全退出关闭页面
//     window.close();
// };
