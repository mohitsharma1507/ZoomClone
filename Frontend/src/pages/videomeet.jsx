import React, { useEffect, useRef, useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import io from "socket.io-client";
import "./videomeet.css";
import { Badge, IconButton } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import { useNavigate } from "react-router-dom";

const server_url = "http://localhost:8080";
const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

let connections = {};

export default function VideoMeetComponent() {
  const navigate = useNavigate();
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(true);
  const [screen, setScreen] = useState(false);
  const [askForUserName, setAskForUserName] = useState(true);
  const [username, setUsername] = useState("");
  const [videos, setVideos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessage, setNewMessage] = useState(0);

  const getPermission = async () => {
    try {
      const userMediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setVideoAvailable(true);
      setAudioAvailable(true);

      window.localStream = userMediaStream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = userMediaStream;
      }

      if (navigator.mediaDevices.getDisplayMedia) {
        setScreen(true);
      }
    } catch (e) {
      console.log("Error accessing media devices:", e.message);
      setVideoAvailable(false);
      setAudioAvailable(false);
    }
  };

  useEffect(() => {
    getPermission();

    // Cleanup function for component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }

      for (let id in connections) {
        if (connections[id]) {
          connections[id].close();
        }
      }
      connections = {};
    };
  }, []);

  const silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  const black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  // Updated getUserMedia function
  const getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({
          video: video && videoAvailable,
          audio: audio && audioAvailable,
        })
        .then((stream) => {
          // Stop any existing tracks
          if (window.localStream) {
            try {
              window.localStream.getTracks().forEach((track) => track.stop());
            } catch (e) {
              console.log("Error stopping existing tracks:", e);
            }
          }

          window.localStream = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          // Update all peer connections with new stream
          updatePeersWithStream(stream);
        })
        .catch((e) => {
          console.log("Error accessing media devices:", e);
          alert(
            "Error accessing media devices. Please check your camera and microphone permissions."
          );
        });
    } else {
      try {
        if (window.localStream) {
          let tracks = window.localStream.getTracks();
          tracks.forEach((track) => track.stop());
        }

        // Create black/silent stream if no media is enabled
        let blackSilence = new MediaStream([black(), silence()]);
        window.localStream = blackSilence;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = blackSilence;
        }

        // Update peer connections with black/silent stream
        updatePeersWithStream(blackSilence);
      } catch (e) {
        console.log("Error stopping tracks:", e.message);
      }
    }
  };

  // Helper function to update all peer connections with a new stream
  const updatePeersWithStream = (stream) => {
    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      // Remove existing tracks
      const senders = connections[id].getSenders();
      senders.forEach((sender) => {
        connections[id].removeTrack(sender);
      });

      // Add new tracks
      stream.getTracks().forEach((track) => {
        connections[id].addTrack(track, stream);
      });

      // Create new offer
      connections[id]
        .createOffer()
        .then((description) => {
          return connections[id].setLocalDescription(description);
        })
        .then(() => {
          if (socketRef.current) {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription })
            );
          }
        })
        .catch((e) => console.log("Error updating peer with stream:", e));
    }
  };

  useEffect(() => {
    if (video !== undefined && audio !== undefined && !askForUserName) {
      getUserMedia();
    }
  }, [audio, video]);

  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prev) => [...prev, { sender: sender, data: data }]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessage((prev) => prev + 1);
    }
  };

  const connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });

    // Store our socket ID
    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      console.log("Connected to socket server with ID:", socketIdRef.current);
      socketRef.current.emit("join-call", window.location.href);
    });

    socketRef.current.on("chat-message", (data, sender, socketIdSender) => {
      addMessage(data, sender, socketIdSender);
    });

    // Handle new user joining the call
    socketRef.current.on("user-joined", (id, clients) => {
      console.log("User joined:", id, "All clients:", clients);

      // Create peer connections for each user
      clients.forEach((socketListId) => {
        if (connections[socketListId] || socketListId === socketIdRef.current)
          return;

        console.log("Creating new connection for", socketListId);
        const peerConnection = new RTCPeerConnection(peerConfigConnections);
        connections[socketListId] = peerConnection;

        // Send ICE candidates to peer
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current.emit(
              "signal",
              socketListId,
              JSON.stringify({ ice: event.candidate })
            );
          }
        };

        // Receive remote tracks from peer
        peerConnection.ontrack = (event) => {
          console.log("Received track from", socketListId);
          const stream = event.streams[0];
          const exists = videos.some((v) => v.socketId === socketListId);

          if (!exists) {
            const newVideo = { socketId: socketListId, stream: stream };
            setVideos((prev) => [...prev, newVideo]);
          }
        };

        // Add our local stream to this connection
        if (window.localStream) {
          window.localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, window.localStream);
          });
        } else {
          const fallback = new MediaStream([black(), silence()]);
          window.localStream = fallback;
          fallback.getTracks().forEach((track) => {
            peerConnection.addTrack(track, fallback);
          });
        }
      });

      // If we're the newly joined user, send offers to others
      if (id === socketIdRef.current) {
        for (let peerId in connections) {
          if (peerId === socketIdRef.current) continue;

          connections[peerId].createOffer().then((description) => {
            connections[peerId].setLocalDescription(description).then(() => {
              socketRef.current.emit(
                "signal",
                peerId,
                JSON.stringify({ sdp: description })
              );
            });
          });
        }
      }
    });

    // Handle incoming signals (ICE / SDP)
    socketRef.current.on("signal", (fromId, message) => {
      console.log("Signal from", fromId);
      const signal = JSON.parse(message);
      let peer = connections[fromId];

      if (!peer) {
        console.log("Creating new connection for signal from", fromId);
        peer = new RTCPeerConnection(peerConfigConnections);
        connections[fromId] = peer;

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current.emit(
              "signal",
              fromId,
              JSON.stringify({ ice: event.candidate })
            );
          }
        };

        peer.ontrack = (event) => {
          console.log("Received track from new peer", fromId);
          const stream = event.streams[0];
          const exists = videos.some((v) => v.socketId === fromId);

          if (!exists) {
            const newVideo = { socketId: fromId, stream: stream };
            setVideos((prev) => [...prev, newVideo]);
          }
        };

        if (window.localStream) {
          window.localStream.getTracks().forEach((track) => {
            peer.addTrack(track, window.localStream);
          });
        }
      }

      if (signal.sdp) {
        peer
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === "offer") {
              peer.createAnswer().then((answer) => {
                peer.setLocalDescription(answer).then(() => {
                  socketRef.current.emit(
                    "signal",
                    fromId,
                    JSON.stringify({ sdp: answer })
                  );
                });
              });
            }
          });
      }

      if (signal.ice) {
        peer
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch((e) => console.log("Error adding ICE candidate:", e));
      }
    });

    // Handle user disconnect
    socketRef.current.on("user-left", (id) => {
      console.log("User left:", id);
      if (connections[id]) {
        connections[id].close();
        delete connections[id];
      }

      setVideos((videos) => videos.filter((video) => video.socketId !== id));
    });

    // Handle server disconnection
    socketRef.current.on("disconnect", () => {
      console.log("Disconnected from socket server");
      for (let id in connections) {
        connections[id].close();
      }
      connections = {};
      setVideos([]);
    });
  };

  const connect = () => {
    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }
    setAskForUserName(false);
    getUserMedia();
    connectToSocketServer();
  };

  const handleVideo = () => {
    setVideo(!video);
  };

  const handleAudio = () => {
    setAudio(!audio);
  };

  // Fixed screen sharing handler
  const handleScreen = () => {
    if (!screen) {
      // Start screen sharing
      navigator.mediaDevices
        .getDisplayMedia({ video: true })
        .then((stream) => {
          try {
            // Stop existing tracks
            if (window.localStream) {
              window.localStream.getTracks().forEach((track) => track.stop());
            }
          } catch (e) {
            console.log("Error stopping tracks:", e);
          }

          // Set as local stream
          window.localStream = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          // Update UI state
          setScreen(true);

          // Share with peers
          updatePeersWithStream(stream);

          // Handle stream end
          stream.getTracks().forEach((track) => {
            track.onended = () => {
              setScreen(false);
              getUserMedia(); // Return to camera when screen share ends
            };
          });
        })
        .catch((error) => {
          console.log("Error accessing screen media:", error);
          setScreen(false);
        });
    } else {
      // Stop screen sharing
      try {
        if (window.localStream) {
          window.localStream.getTracks().forEach((track) => track.stop());
        }
      } catch (e) {
        console.log("Error stopping tracks:", e);
      }

      // Return to camera
      setScreen(false);
      getUserMedia();
    }
  };

  const sendMessage = () => {
    if (message.trim() === "" || !socketRef.current) return;

    socketRef.current.emit("chat-message", message, username);
    // Add message to our own chat
    addMessage(message, username, socketIdRef.current);
    setMessage("");
  };

  const toggleChat = () => {
    setShowModal(!showModal);
    if (!showModal) {
      setNewMessage(0);
    }
  };

  const handleEndCall = () => {
    try {
      if (window.localStream) {
        let tracks = window.localStream.getTracks();
        tracks.forEach((track) => track.stop());
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      for (let id in connections) {
        if (connections[id]) {
          connections[id].close();
        }
      }
      connections = {};
    } catch (e) {
      console.log("Error ending call:", e);
    }
    navigate("/home");
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div>
      {askForUserName ? (
        <div className="lobbyContainer">
          <h2>Enter into Lobby</h2>
          <TextField
            id="outlined-basic"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
            onKeyPress={(e) => {
              if (e.key === "Enter") connect();
            }}
          />
          <Button
            variant="contained"
            onClick={connect}
            disabled={!username.trim()}
          >
            Connect
          </Button>
          <div>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              style={{
                width: "500px",
                height: "500px",
                backgroundColor: "black",
              }}
            ></video>
          </div>
        </div>
      ) : (
        <div className="meetVideoContainer">
          {showModal && (
            <div className="chatRoom">
              <div className="chatContainer">
                <h1>Chats</h1>
                <div className="chatDisplay">
                  {messages.length > 0 ? (
                    messages.map((item, idx) => (
                      <div style={{ marginBottom: "20px" }} key={idx}>
                        <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                        <p>{item.data}</p>
                      </div>
                    ))
                  ) : (
                    <p>No Messages Yet</p>
                  )}
                </div>
                <div className="chatArea">
                  <TextField
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    id="outlined-basic"
                    label="Write Msg here"
                    variant="outlined"
                  />
                  <Button variant="contained" onClick={sendMessage}>
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="buttonContainer">
            <IconButton onClick={handleVideo} style={{ color: "grey" }}>
              {video ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
            <IconButton onClick={handleEndCall} style={{ color: "Red" }}>
              <CallEndIcon />
            </IconButton>
            <IconButton onClick={handleAudio} style={{ color: "grey" }}>
              {audio ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            <IconButton onClick={handleScreen} style={{ color: "grey" }}>
              {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
            </IconButton>

            <Badge badgeContent={newMessage} max={999} color="secondary">
              <IconButton onClick={toggleChat} style={{ color: "grey" }}>
                <ChatIcon />
              </IconButton>
            </Badge>
          </div>
          <video
            className="meetUserVideo"
            ref={localVideoRef}
            autoPlay
            muted
            style={{
              width: "500px",
              height: "500px",
              backgroundColor: "black",
            }}
          ></video>
          <div className="ConferenceView">
            {videos.map((video) => (
              <div key={video.socketId} className="remoteVideo">
                <video
                  autoPlay
                  playsInline
                  ref={(ref) => {
                    if (ref && video.stream) {
                      ref.srcObject = video.stream;
                    }
                  }}
                  style={{
                    width: "500px",
                    height: "500px",
                    backgroundColor: "black",
                  }}
                ></video>
                <div className="remoteUsername">{video.socketId}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
