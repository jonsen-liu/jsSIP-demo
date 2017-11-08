/**
 * Created by Administrator on 2017/11/6.
 */
var outgoingSession = null;
var incomingSession = null;
var currentSession = null;

var mybody = document.getElementsByTagName("body")[0];
var header = document.getElementById("header");
var login = document.getElementById("login");
var footer = document.getElementById("footer");
var headPortrait = document.getElementById("headPortrait");//头像
var username = document.getElementById("username");//用户姓名
var out = document.getElementById("out");//退出会话按钮
var videoView = document.getElementById('videoView');
var videoView2 = document.getElementById('videoView2');
var repetitionS = document.getElementById("repetitionS");//接听挂断的父盒子

var sip_uri_;
var sip_password_;
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
    // if (sip_phone_number != "") {
    //     testCall();
    // }
}

function captureLocalMedia() {
    console.info('Requesting local video & audio');
    navigator.webkitGetUserMedia(constraints, gotLocalMedia, function (e) {
        alert('getUserMedia() error: ' + e.name);
    });
}

function testStart() {

    var socket = new JsSIP.WebSocketInterface(ws_uri_);
    var configuration = {
        sockets: [socket],
        outbound_proxy_set: ws_uri_,
        uri: sip_uri_,
        password: sip_password_,
        register: true,
        session_timers: false,
        register_expires:14000//注册时间秒为单位 14000s==3.8888889h
    };

    userAgent = new JsSIP.UA(configuration);

    userAgent.on('registered', function (data) {//初始化成功
        console.info("registered: ", data.response.status_code, ",", data.response.reason_phrase);
        headPortrait.src = "./img/face2.png";
    });

    userAgent.on('registrationFailed', function (data) {

        console.log("registrationFailed, ", data);
    });

    userAgent.on('registrationExpiring', function () {//注册到期
        testStart();//注册到期再次注册
        console.warn("registrationExpiring");
    });

    userAgent.on('newRTCSession', function (data) {
            console.info('onNewRTCSession: ', data);
            if (data.originator == 'remote') { //来电
                //来电第一步
                var callAudio = new Audio();
                callAudio.src = "./sounds/ringing.ogg";
                callAudio.play();
                repetitionS.style.display = "block";
                document.getElementById("going").onclick = function () {
                    repetitionS.style.display = "none";
                    captureLocalMedia();
                    console.info("incomingSession, answer the call");
                    incomingSession = data.session;
                    data.session.answer({
                        'mediaConstraints': {
                            'audio': true,
                            'video': true
                        },
                        'mediaStream': localStream
                    });
                };
                document.getElementById("outing").onclick = function () {
                    repetitionS.style.display = "none";
                    data.session.terminate();
                    var serAudio = new Audio();
                    serAudio.src = "./sounds/rejected.mp3";
                    serAudio.play();
                    // serAudio=null;
                }
            }
            data.session.on('accepted', function (data) {//通话被接受时
                document.getElementById("repetitionS").style.display = "none";
                console.info('onAccepted - ', data);
                videoView2.style.display = "block";
                videoView.style.display = "block";
                if (data.originator == 'remote' && currentSession == null) {
                    currentSession = incomingSession;
                    incomingSession = null;
                    console.info("setCurrentSession - ", currentSession);
                }
            });
            data.session.on('confirmed', function (data) {//确认
                //成功后发出的声音
                var callAudio = new Audio();//音频
                callAudio.src = "./sounds/answered.mp3";// 去电播放音
                callAudio.play();
                console.info('onConfirmed - ', data);
                if (data.originator == 'remote' && currentSession == null) {
                    currentSession = incomingSession;
                    incomingSession = null;
                    console.info("setCurrentSession - ", currentSession);
                }
            });
            data.session.on('ended', function (data) {//已建立的通话结束时
                console.info('ended - ', data);
                if (data.originator == "remote") {
                    videoView2.style.display = "none";
                    videoView.src = "";
                    videoView.style.display = "none";
                    // alert("对方已挂断电话");
                    // location.replace(location);
                } else if (data.originator == "local") {
                    videoView2.style.display = "none";
                    videoView.src = "";
                    videoView.style.display = "none";
                    // alert("你已挂断电话");
                    // location.replace(location);
                } else {
                    alert("系统挂断");
                    location.replace(location);
                }
            });
            data.session.on('sdp', function (data) {
                console.info('onSDP, type - ', data.type, ' sdp - ', data.sdp);
            });
            data.session.on('progress', function (data) {
                //来电第二步
                console.info('onProgress - ', data.originator);
                if (data.originator == 'remote') {
                    console.info('onProgress, response - ', data.response);
                }
            });

            data.session.on('peerconnection', function (data) {
                //来电第三步
                console.info('onPeerconnection - ', data.peerconnection);
                data.peerconnection.onaddstream = function (ev) {//渲染对方视频
                    //来电第五步
                    console.info('onaddstream from remote - ', ev);
                    videoView2.src = URL.createObjectURL(ev.stream);
                };
            });
        }
    )
    ;
    userAgent.on('newMessage', function (data) {
        if (data.originator == 'local') {
            console.info('onNewMessage , OutgoingRequest - ', data.request);
        } else {
            console.info('onNewMessage , IncomingRequest - ', data.request);
        }
    });

    console.info("call register");
    userAgent.start();
}


login.onclick = function () {//新建会话
    mybody.style.backgroundImage="url(./img/service.jpg)";
    // mybody.style.background=" url(./img/service.jpg) no-repeat center center;";

    sip_uri_ = document.getElementById("sip_uri").value.toString();
    sip_password_ = document.getElementById("sip_password").value.toString();
    ws_uri_ = document.getElementById("ws_uri").value.toString();

    console.log(sip_phone_number);

    headPortrait.src = "./img/face1.png";
    username.innerHTML = sip_uri_;
    header.style.display = "none";
    footer.style.display = "block";
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
        localStorage.setItem("myservive", toStr);
        header.style.display = "none";
        footer.style.display = "block";
    } else {
        localStorage.clear();
    }
};

out.onclick = function () {//退出会话
    var options;
    userAgent.terminateSessions(options = null);
};
var data = localStorage.getItem("myservive");//取出localStorage数据
if (data != null) {//如果有数据
    data = JSON.parse(data);
    sip_uri_ = data.sip_uri;
    sip_password_ = data.sip_password;
    ws_uri_ = data.ws_uri;
    sip_phone_number = data.sip_phone_number;


    username.innerHTML = sip_uri_;

    istrue.checked = data.istrue;//保存设置是否勾选
    document.getElementById("sip_uri").value = data.sip_uri;
    document.getElementById("sip_password").value = data.sip_password;
    document.getElementById("ws_uri").value = data.ws_uri;
    header.style.display = "none";
    footer.style.display = "block";
    testStart();
}else {
    mybody.style.backgroundImage="none";
    mybody.style.backgroundColor="#2B2B2B";
    header.style.display="block";
}