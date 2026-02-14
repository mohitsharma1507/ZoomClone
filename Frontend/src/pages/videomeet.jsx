// import React, { useContext, useEffect, useRef, useState } from "react";
// import TextField from "@mui/material/TextField";
// import Button from "@mui/material/Button";
// import io from "socket.io-client";
// import "./videomeet.css";
// import { Badge, IconButton } from "@mui/material";
// import VideocamIcon from "@mui/icons-material/Videocam";
// import VideocamOffIcon from "@mui/icons-material/VideocamOff";
// import CallEndIcon from "@mui/icons-material/CallEnd";
// import MicIcon from "@mui/icons-material/Mic";
// import MicOffIcon from "@mui/icons-material/MicOff";
// import ScreenShareIcon from "@mui/icons-material/ScreenShare";
// import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
// import ChatIcon from "@mui/icons-material/Chat";
// import { useNavigate, useParams } from "react-router-dom";
// import { AuthContext } from "../contexts/AuthContext";

// const server_url = "http://localhost:8080";
// const peerConfigConnections = {
//   iceServers: [
//     { urls: "stun:stun.l.google.com:19302" },
//     { urls: "stun:stun1.l.google.com:19302" },
//   ],
// };

// let connections = {};

// export default function VideoMeetComponent() {
//   const { url } = useParams();
//   const meetingCode = url;
//   const { addToUserHistory } = useContext(AuthContext);
//   const navigate = useNavigate();
//   const socketRef = useRef();
//   const socketIdRef = useRef();
//   const localVideoRef = useRef();
//   const [videoAvailable, setVideoAvailable] = useState(true);
//   const [audioAvailable, setAudioAvailable] = useState(true);
//   const [showModal, setShowModal] = useState(false);
//   const [video, setVideo] = useState(true);
//   const [audio, setAudio] = useState(true);
//   const [screen, setScreen] = useState(false);
//   const [askForUserName, setAskForUserName] = useState(true);
//   const [username, setUsername] = useState("");
//   const [videos, setVideos] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [message, setMessage] = useState("");
//   const [newMessage, setNewMessage] = useState(0);

//   const videoStreamsRef = useRef(new Map());

//   const getPermission = async () => {
//     try {
//       console.log("🎥 Requesting camera/microphone permissions...");
//       const userMediaStream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });

//       console.log("✅ Got media stream:", {
//         videoTracks: userMediaStream.getVideoTracks().length,
//         audioTracks: userMediaStream.getAudioTracks().length,
//       });

//       setVideoAvailable(true);
//       setAudioAvailable(true);

//       window.localStream = userMediaStream;

//       if (localVideoRef.current) {
//         localVideoRef.current.srcObject = userMediaStream;
//         console.log("✅ Local video element updated");
//       }

//       if (navigator.mediaDevices.getDisplayMedia) {
//         setScreen(true);
//       }
//     } catch (e) {
//       console.error("❌ Error accessing media devices:", e.message);
//       console.error(
//         "⚠️ This is likely because another browser tab is using the camera!",
//       );
//       console.error(
//         "💡 Solution: Use a different device or close other tabs using camera",
//       );
//       setVideoAvailable(false);
//       setAudioAvailable(false);
//     }
//   };

//   useEffect(() => {
//     getPermission();

//     return () => {
//       console.log("🧹 Cleaning up component...");
//       if (socketRef.current) {
//         socketRef.current.disconnect();
//       }

//       if (window.localStream) {
//         window.localStream.getTracks().forEach((track) => {
//           track.stop();
//           console.log(`Stopped ${track.kind} track`);
//         });
//       }

//       for (let id in connections) {
//         if (connections[id]) {
//           connections[id].close();
//         }
//       }
//       connections = {};
//       videoStreamsRef.current.clear();
//     };
//   }, []);

//   const silence = () => {
//     let ctx = new AudioContext();
//     let oscillator = ctx.createOscillator();
//     let dst = oscillator.connect(ctx.createMediaStreamDestination());
//     oscillator.start();
//     ctx.resume();
//     return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
//   };

//   const black = ({ width = 640, height = 480 } = {}) => {
//     let canvas = Object.assign(document.createElement("canvas"), {
//       width,
//       height,
//     });
//     canvas.getContext("2d").fillRect(0, 0, width, height);
//     let stream = canvas.captureStream();
//     return Object.assign(stream.getVideoTracks()[0], { enabled: false });
//   };

//   const getUserMedia = () => {
//     console.log("🎬 getUserMedia called - video:", video, "audio:", audio);

//     if ((video && videoAvailable) || (audio && audioAvailable)) {
//       navigator.mediaDevices
//         .getUserMedia({
//           video: video && videoAvailable,
//           audio: audio && audioAvailable,
//         })
//         .then((stream) => {
//           console.log("✅ Got new media stream:", {
//             videoTracks: stream.getVideoTracks().length,
//             audioTracks: stream.getAudioTracks().length,
//           });

//           if (window.localStream) {
//             try {
//               window.localStream.getTracks().forEach((track) => {
//                 track.stop();
//                 console.log(`Stopped old ${track.kind} track`);
//               });
//             } catch (e) {
//               console.error("Error stopping existing tracks:", e);
//             }
//           }

//           window.localStream = stream;
//           if (localVideoRef.current) {
//             localVideoRef.current.srcObject = stream;
//           }

//           updatePeersWithStream(stream);
//         })
//         .catch((e) => {
//           console.error("❌ Error accessing media devices:", e.message);
//           console.error("⚠️ Camera might be in use by another tab/app!");
//           alert(
//             "Camera Error: Another browser tab or application might be using your camera. Please close other tabs and try again.",
//           );
//         });
//     } else {
//       console.log("⚫ Creating black/silent stream");
//       try {
//         if (window.localStream) {
//           let tracks = window.localStream.getTracks();
//           tracks.forEach((track) => track.stop());
//         }

//         let blackSilence = new MediaStream([black(), silence()]);
//         window.localStream = blackSilence;
//         if (localVideoRef.current) {
//           localVideoRef.current.srcObject = blackSilence;
//         }

//         updatePeersWithStream(blackSilence);
//       } catch (e) {
//         console.error("Error stopping tracks:", e);
//       }
//     }
//   };

//   const updatePeersWithStream = (stream) => {
//     console.log("🔄 Updating all peers with new stream");
//     for (let id in connections) {
//       if (id === socketIdRef.current) continue;

//       console.log(`Updating peer ${id} with new stream`);
//       const senders = connections[id].getSenders();
//       senders.forEach((sender) => {
//         connections[id].removeTrack(sender);
//       });

//       stream.getTracks().forEach((track) => {
//         connections[id].addTrack(track, stream);
//         console.log(`Added ${track.kind} track to peer ${id}`);
//       });

//       connections[id]
//         .createOffer()
//         .then((description) => {
//           return connections[id].setLocalDescription(description);
//         })
//         .then(() => {
//           if (socketRef.current) {
//             socketRef.current.emit(
//               "signal",
//               id,
//               JSON.stringify({ sdp: connections[id].localDescription }),
//             );
//             console.log(`✉️ Sent updated offer to ${id}`);
//           }
//         })
//         .catch((e) => console.error("Error updating peer with stream:", e));
//     }
//   };

//   useEffect(() => {
//     if (video !== undefined && audio !== undefined && !askForUserName) {
//       getUserMedia();
//     }
//   }, [audio, video]);

//   const addMessage = (data, sender, socketIdSender) => {
//     setMessages((prev) => [...prev, { sender: sender, data: data }]);
//     if (socketIdSender !== socketIdRef.current) {
//       setNewMessage((prev) => prev + 1);
//     }
//   };

//   const updateVideosFromMap = () => {
//     const updatedVideos = Array.from(videoStreamsRef.current.entries()).map(
//       ([socketId, streamData]) => ({
//         socketId,
//         stream: streamData.stream,
//         username: streamData.username || socketId,
//       }),
//     );
//     console.log("📺 Updated videos list:", updatedVideos.length, "streams");
//     setVideos(updatedVideos);
//   };

//   const connectToSocketServer = () => {
//     console.log("🔌 Connecting to socket server...");
//     socketRef.current = io.connect(server_url, { secure: false });

//     socketRef.current.on("connect", () => {
//       socketIdRef.current = socketRef.current.id;
//       console.log("✅ Connected with socket ID:", socketIdRef.current);
//       socketRef.current.emit("join-call", window.location.href, username);
//     });

//     socketRef.current.on("chat-message", (data, sender, socketIdSender) => {
//       addMessage(data, sender, socketIdSender);
//     });

//     socketRef.current.on("user-joined", (id, clients, usernames = {}) => {
//       console.log("👤 User joined event:", {
//         newUserId: id,
//         allClients: clients,
//         usernames: usernames,
//         isMe: id === socketIdRef.current,
//       });

//       clients.forEach((socketListId) => {
//         if (connections[socketListId] || socketListId === socketIdRef.current) {
//           console.log(
//             `⏭️ Skipping ${socketListId} (already connected or self)`,
//           );
//           return;
//         }

//         console.log(`🔗 Creating new RTCPeerConnection for ${socketListId}`);
//         const peerConnection = new RTCPeerConnection(peerConfigConnections);
//         connections[socketListId] = peerConnection;

//         peerConnection.onicecandidate = (event) => {
//           if (event.candidate) {
//             console.log(
//               `🧊 ICE candidate for ${socketListId}:`,
//               event.candidate.type,
//             );
//             socketRef.current.emit(
//               "signal",
//               socketListId,
//               JSON.stringify({ ice: event.candidate }),
//             );
//           } else {
//             console.log(`✅ All ICE candidates sent for ${socketListId}`);
//           }
//         };

//         // FIXED: Always update stream, even if it exists
//         peerConnection.ontrack = (event) => {
//           console.log(
//             `🎵 Received ${event.track.kind} track from ${socketListId}`,
//           );
//           console.log("Stream info:", {
//             streamId: event.streams[0].id,
//             videoTracks: event.streams[0].getVideoTracks().length,
//             audioTracks: event.streams[0].getAudioTracks().length,
//           });

//           const stream = event.streams[0];

//           // CHANGED: Always set/update the stream, don't check if it exists
//           videoStreamsRef.current.set(socketListId, {
//             stream: stream,
//             username: usernames[socketListId] || socketListId,
//           });
//           console.log(
//             `✅ ${videoStreamsRef.current.has(socketListId) ? "Updated" : "Added"} stream for ${socketListId}`,
//           );
//           updateVideosFromMap();
//         };

//         peerConnection.onconnectionstatechange = () => {
//           console.log(
//             `🔌 Connection state with ${socketListId}:`,
//             peerConnection.connectionState,
//           );
//           if (peerConnection.connectionState === "failed") {
//             console.error(`❌ Connection failed with ${socketListId}`);
//           }
//         };

//         peerConnection.oniceconnectionstatechange = () => {
//           console.log(
//             `🧊 ICE state with ${socketListId}:`,
//             peerConnection.iceConnectionState,
//           );
//           if (peerConnection.iceConnectionState === "failed") {
//             console.error(`❌ ICE connection failed with ${socketListId}`);
//           }
//         };

//         peerConnection.onsignalingstatechange = () => {
//           console.log(
//             `📡 Signaling state with ${socketListId}:`,
//             peerConnection.signalingState,
//           );
//         };

//         if (window.localStream) {
//           console.log(`➕ Adding local stream tracks to ${socketListId}`);
//           window.localStream.getTracks().forEach((track) => {
//             peerConnection.addTrack(track, window.localStream);
//             console.log(
//               `  - Added ${track.kind} track (enabled: ${track.enabled})`,
//             );
//           });
//         } else {
//           console.log(`⚠️ No local stream, using fallback for ${socketListId}`);
//           const fallback = new MediaStream([black(), silence()]);
//           window.localStream = fallback;
//           fallback.getTracks().forEach((track) => {
//             peerConnection.addTrack(track, fallback);
//           });
//         }
//       });

//       if (id === socketIdRef.current) {
//         console.log("🎯 I'm the new user, creating offers...");
//         for (let peerId in connections) {
//           if (peerId === socketIdRef.current) continue;

//           console.log(`📤 Creating offer for ${peerId}`);
//           connections[peerId]
//             .createOffer()
//             .then((description) => {
//               console.log(`✅ Offer created for ${peerId}`);
//               return connections[peerId].setLocalDescription(description);
//             })
//             .then(() => {
//               console.log(`📨 Sending offer to ${peerId}`);
//               socketRef.current.emit(
//                 "signal",
//                 peerId,
//                 JSON.stringify({ sdp: connections[peerId].localDescription }),
//               );
//             })
//             .catch((e) =>
//               console.error(`❌ Error creating offer for ${peerId}:`, e),
//             );
//         }
//       }
//     });

//     socketRef.current.on("signal", (fromId, message) => {
//       console.log(`📨 Signal received from ${fromId}`);
//       const signal = JSON.parse(message);
//       let peer = connections[fromId];

//       if (!peer) {
//         console.log(`🆕 Creating new peer connection for ${fromId}`);
//         peer = new RTCPeerConnection(peerConfigConnections);
//         connections[fromId] = peer;

//         peer.onicecandidate = (event) => {
//           if (event.candidate) {
//             console.log(
//               `🧊 ICE candidate for ${fromId}:`,
//               event.candidate.type,
//             );
//             socketRef.current.emit(
//               "signal",
//               fromId,
//               JSON.stringify({ ice: event.candidate }),
//             );
//           }
//         };

//         // FIXED: Always update stream
//         peer.ontrack = (event) => {
//           console.log(
//             `🎵 Track received from new peer ${fromId}:`,
//             event.track.kind,
//           );
//           const stream = event.streams[0];

//           // CHANGED: Always set/update
//           videoStreamsRef.current.set(fromId, {
//             stream: stream,
//             username: fromId,
//           });
//           console.log(
//             `✅ ${videoStreamsRef.current.has(fromId) ? "Updated" : "Added"} new peer stream`,
//           );
//           updateVideosFromMap();
//         };

//         peer.onconnectionstatechange = () => {
//           console.log(
//             `🔌 Connection state with ${fromId}:`,
//             peer.connectionState,
//           );
//         };

//         peer.oniceconnectionstatechange = () => {
//           console.log(`🧊 ICE state with ${fromId}:`, peer.iceConnectionState);
//         };

//         if (window.localStream) {
//           console.log(`➕ Adding local tracks to new peer ${fromId}`);
//           window.localStream.getTracks().forEach((track) => {
//             peer.addTrack(track, window.localStream);
//             console.log(
//               `  - Added ${track.kind} track (enabled: ${track.enabled})`,
//             );
//           });
//         }
//       }

//       if (signal.sdp) {
//         console.log(`📋 Processing SDP from ${fromId}:`, signal.sdp.type);
//         peer
//           .setRemoteDescription(new RTCSessionDescription(signal.sdp))
//           .then(() => {
//             console.log(`✅ Remote description set for ${fromId}`);
//             if (signal.sdp.type === "offer") {
//               console.log(`📝 Creating answer for ${fromId}`);
//               return peer.createAnswer();
//             }
//           })
//           .then((answer) => {
//             if (answer) {
//               console.log(`✅ Answer created for ${fromId}`);
//               return peer.setLocalDescription(answer);
//             }
//           })
//           .then(() => {
//             if (signal.sdp.type === "offer") {
//               console.log(`📨 Sending answer to ${fromId}`);
//               socketRef.current.emit(
//                 "signal",
//                 fromId,
//                 JSON.stringify({ sdp: peer.localDescription }),
//               );
//             }
//           })
//           .catch((e) =>
//             console.error(`❌ Error handling SDP from ${fromId}:`, e),
//           );
//       }

//       if (signal.ice) {
//         console.log(`🧊 Adding ICE candidate from ${fromId}`);
//         peer
//           .addIceCandidate(new RTCIceCandidate(signal.ice))
//           .then(() => console.log(`✅ ICE candidate added from ${fromId}`))
//           .catch((e) =>
//             console.error(`❌ Error adding ICE candidate from ${fromId}:`, e),
//           );
//       }
//     });

//     socketRef.current.on("user-left", (id) => {
//       console.log(`👋 User left: ${id}`);
//       if (connections[id]) {
//         connections[id].close();
//         delete connections[id];
//       }

//       if (videoStreamsRef.current.has(id)) {
//         videoStreamsRef.current.delete(id);
//         updateVideosFromMap();
//       }
//     });

//     socketRef.current.on("disconnect", () => {
//       console.log("🔌 Disconnected from socket server");
//       for (let id in connections) {
//         connections[id].close();
//       }
//       connections = {};
//       videoStreamsRef.current.clear();
//       setVideos([]);
//     });
//   };

//   const connect = () => {
//     if (!username.trim()) {
//       alert("Please enter a username");
//       return;
//     }
//     console.log(`🚀 Starting connection as ${username}`);
//     setAskForUserName(false);
//     getUserMedia();
//     connectToSocketServer();
//   };

//   const handleVideo = () => {
//     console.log(`🎥 Toggling video: ${!video}`);
//     setVideo(!video);
//   };

//   const handleAudio = () => {
//     console.log(`🎤 Toggling audio: ${!audio}`);
//     setAudio(!audio);
//   };

//   const handleScreen = () => {
//     if (!screen) {
//       console.log("🖥️ Starting screen share...");
//       navigator.mediaDevices
//         .getDisplayMedia({ video: true })
//         .then((stream) => {
//           try {
//             if (window.localStream) {
//               window.localStream.getTracks().forEach((track) => track.stop());
//             }
//           } catch (e) {
//             console.error("Error stopping tracks:", e);
//           }

//           window.localStream = stream;
//           if (localVideoRef.current) {
//             localVideoRef.current.srcObject = stream;
//           }

//           setScreen(true);
//           updatePeersWithStream(stream);

//           stream.getTracks().forEach((track) => {
//             track.onended = () => {
//               console.log("🛑 Screen share ended");
//               setScreen(false);
//               getUserMedia();
//             };
//           });
//         })
//         .catch((error) => {
//           console.error("❌ Error accessing screen:", error);
//           setScreen(false);
//         });
//     } else {
//       console.log("🛑 Stopping screen share");
//       try {
//         if (window.localStream) {
//           window.localStream.getTracks().forEach((track) => track.stop());
//         }
//       } catch (e) {
//         console.error("Error stopping tracks:", e);
//       }

//       setScreen(false);
//       getUserMedia();
//     }
//   };

//   const sendMessage = () => {
//     if (message.trim() === "" || !socketRef.current) return;

//     socketRef.current.emit("chat-message", message, username);
//     addMessage(message, username, socketIdRef.current);
//     setMessage("");
//   };

//   const toggleChat = () => {
//     setShowModal(!showModal);
//     if (!showModal) {
//       setNewMessage(0);
//     }
//   };

//   const handleEndCall = async () => {
//     console.log("Ending call...");
//     console.log("=== ENDING CALL DEBUG ===");
//     console.log("1. URL param:", url);
//     console.log("2. Meeting code:", meetingCode);
//     if (meetingCode) {
//       try {
//         await addToUserHistory(meetingCode);
//         console.log("Meeting saved to history");
//       } catch (err) {
//         console.error("Error saving to history:", err);
//       }
//     }

//     try {
//       if (window.localStream) {
//         let tracks = window.localStream.getTracks();
//         tracks.forEach((track) => track.stop());
//       }

//       if (socketRef.current) {
//         socketRef.current.disconnect();
//       }

//       for (let id in connections) {
//         if (connections[id]) {
//           connections[id].close();
//         }
//       }
//       connections = {};
//       videoStreamsRef.current.clear();
//     } catch (e) {
//       console.error("Error ending call:", e);
//     }
//     navigate("/home");
//   };

//   const handleKeyPress = (event) => {
//     if (event.key === "Enter") {
//       sendMessage();
//     }
//   };

//   return (
//     <div>
//       {askForUserName ? (
//         <div className="lobbyContainer">
//           <h2>Enter into Lobby</h2>
//           <TextField
//             id="outlined-basic"
//             label="Username"
//             value={username}
//             onChange={(e) => setUsername(e.target.value)}
//             variant="outlined"
//             onKeyPress={(e) => {
//               if (e.key === "Enter") connect();
//             }}
//           />
//           <Button
//             variant="contained"
//             onClick={connect}
//             disabled={!username.trim()}
//           >
//             Connect
//           </Button>
//           <div>
//             <video
//               ref={localVideoRef}
//               autoPlay
//               muted
//               style={{
//                 width: "500px",
//                 height: "500px",
//                 backgroundColor: "black",
//               }}
//             ></video>
//           </div>
//         </div>
//       ) : (
//         <div className="meetVideoContainer">
//           {showModal && (
//             <div className="chatRoom">
//               <div className="chatContainer">
//                 <h1>Chats</h1>
//                 <div className="chatDisplay">
//                   {messages.length > 0 ? (
//                     messages.map((item, idx) => (
//                       <div style={{ marginBottom: "20px" }} key={idx}>
//                         <p style={{ fontWeight: "bold" }}>{item.sender}</p>
//                         <p>{item.data}</p>
//                       </div>
//                     ))
//                   ) : (
//                     <p>No Messages Yet</p>
//                   )}
//                 </div>
//                 <div className="chatArea">
//                   <TextField
//                     value={message}
//                     onChange={(e) => setMessage(e.target.value)}
//                     onKeyPress={handleKeyPress}
//                     id="outlined-basic"
//                     label="Write Msg here"
//                     variant="outlined"
//                   />
//                   <Button variant="contained" onClick={sendMessage}>
//                     Send
//                   </Button>
//                 </div>
//               </div>
//             </div>
//           )}
//           <div className="buttonContainer">
//             <IconButton onClick={handleVideo} style={{ color: "grey" }}>
//               {video ? <VideocamIcon /> : <VideocamOffIcon />}
//             </IconButton>
//             <IconButton onClick={handleEndCall} style={{ color: "Red" }}>
//               <CallEndIcon />
//             </IconButton>
//             <IconButton onClick={handleAudio} style={{ color: "grey" }}>
//               {audio ? <MicIcon /> : <MicOffIcon />}
//             </IconButton>

//             <IconButton onClick={handleScreen} style={{ color: "grey" }}>
//               {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
//             </IconButton>

//             <Badge badgeContent={newMessage} max={999} color="secondary">
//               <IconButton onClick={toggleChat} style={{ color: "grey" }}>
//                 <ChatIcon />
//               </IconButton>
//             </Badge>
//           </div>

//           <div
//             style={{
//               padding: "10px",
//               backgroundColor: "#f0f0f0",
//               margin: "10px",
//             }}
//           >
//             <strong>🔍 Debug Info:</strong> My ID: {socketIdRef.current} |
//             Connected Peers: {Object.keys(connections).length} | Video Streams:{" "}
//             {videos.length}
//             {!videoAvailable && (
//               <div style={{ color: "red" }}>
//                 ⚠️ Camera unavailable (probably in use by another tab)
//               </div>
//             )}
//           </div>

//           <video
//             className="meetUserVideo"
//             ref={localVideoRef}
//             autoPlay
//             muted
//             style={{
//               width: "500px",
//               height: "500px",
//               backgroundColor: "black",
//               border: "2px solid green",
//             }}
//           ></video>
//           <div className="ConferenceView">
//             {videos.map((video) => (
//               <div key={video.socketId} className="remoteVideo">
//                 <video
//                   autoPlay
//                   playsInline
//                   ref={(ref) => {
//                     if (ref && video.stream) {
//                       ref.srcObject = video.stream;
//                       console.log(`🎬 Set srcObject for ${video.socketId}`, {
//                         videoTracks: video.stream.getVideoTracks().length,
//                         audioTracks: video.stream.getAudioTracks().length,
//                       });
//                     }
//                   }}
//                   style={{
//                     width: "500px",
//                     height: "500px",
//                     backgroundColor: "black",
//                     border: "2px solid blue",
//                   }}
//                 ></video>
//                 <div className="remoteUsername">{video.username}</div>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
import React, { useContext, useEffect, useRef, useState } from "react";
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
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

const server_url = "http://localhost:8080";
const peerConfigConnections = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

let connections = {};

export default function VideoMeetComponent() {
  const { url } = useParams();
  const meetingCode = url;
  const { addToUserHistory } = useContext(AuthContext);
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

  const videoStreamsRef = useRef(new Map());

  const getPermission = async () => {
    try {
      console.log("🎥 Requesting camera/microphone permissions...");
      const userMediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log("✅ Got media stream:", {
        videoTracks: userMediaStream.getVideoTracks().length,
        audioTracks: userMediaStream.getAudioTracks().length,
      });

      setVideoAvailable(true);
      setAudioAvailable(true);

      window.localStream = userMediaStream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = userMediaStream;
        console.log("✅ Local video element updated");
      }

      if (navigator.mediaDevices.getDisplayMedia) {
        setScreen(true);
      }
    } catch (e) {
      console.error("❌ Error accessing media devices:", e.message);
      console.error(
        "⚠️ This is likely because another browser tab is using the camera!",
      );
      console.error(
        "💡 Solution: Use a different device or close other tabs using camera",
      );
      setVideoAvailable(false);
      setAudioAvailable(false);
    }
  };

  useEffect(() => {
    getPermission();

    return () => {
      console.log("🧹 Cleaning up component...");
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => {
          track.stop();
          console.log(`Stopped ${track.kind} track`);
        });
      }

      for (let id in connections) {
        if (connections[id]) {
          connections[id].close();
        }
      }
      connections = {};
      videoStreamsRef.current.clear();
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

  const getUserMedia = () => {
    console.log("🎬 getUserMedia called - video:", video, "audio:", audio);

    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({
          video: video && videoAvailable,
          audio: audio && audioAvailable,
        })
        .then((stream) => {
          console.log("✅ Got new media stream:", {
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length,
          });

          if (window.localStream) {
            try {
              window.localStream.getTracks().forEach((track) => {
                track.stop();
                console.log(`Stopped old ${track.kind} track`);
              });
            } catch (e) {
              console.error("Error stopping existing tracks:", e);
            }
          }

          window.localStream = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          updatePeersWithStream(stream);
        })
        .catch((e) => {
          console.error("❌ Error accessing media devices:", e.message);
          console.error("⚠️ Camera might be in use by another tab/app!");
          alert(
            "Camera Error: Another browser tab or application might be using your camera. Please close other tabs and try again.",
          );
        });
    } else {
      console.log("⚫ Creating black/silent stream");
      try {
        if (window.localStream) {
          let tracks = window.localStream.getTracks();
          tracks.forEach((track) => track.stop());
        }

        let blackSilence = new MediaStream([black(), silence()]);
        window.localStream = blackSilence;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = blackSilence;
        }

        updatePeersWithStream(blackSilence);
      } catch (e) {
        console.error("Error stopping tracks:", e);
      }
    }
  };

  const updatePeersWithStream = (stream) => {
    console.log("🔄 Updating all peers with new stream");
    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      console.log(`Updating peer ${id} with new stream`);
      const senders = connections[id].getSenders();
      senders.forEach((sender) => {
        connections[id].removeTrack(sender);
      });

      stream.getTracks().forEach((track) => {
        connections[id].addTrack(track, stream);
        console.log(`Added ${track.kind} track to peer ${id}`);
      });

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
              JSON.stringify({ sdp: connections[id].localDescription }),
            );
            console.log(`✉️ Sent updated offer to ${id}`);
          }
        })
        .catch((e) => console.error("Error updating peer with stream:", e));
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

  const updateVideosFromMap = () => {
    const updatedVideos = Array.from(videoStreamsRef.current.entries()).map(
      ([socketId, streamData]) => ({
        socketId,
        stream: streamData.stream,
        username: streamData.username || socketId,
      }),
    );
    console.log("📺 Updated videos list:", updatedVideos.length, "streams");
    setVideos(updatedVideos);
  };

  const connectToSocketServer = () => {
    console.log("🔌 Connecting to socket server...");
    socketRef.current = io.connect(server_url, { secure: false });

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      console.log("✅ Connected with socket ID:", socketIdRef.current);
      socketRef.current.emit("join-call", window.location.href, username);
    });

    socketRef.current.on("chat-message", (data, sender, socketIdSender) => {
      if (socketIdSender === socketIdRef.current) {
        console.log("Received own chat message, ignoring:", data);
        return;
      }
      addMessage(data, sender, socketIdSender);
    });

    socketRef.current.on("user-joined", (id, clients, usernames = {}) => {
      console.log("👤 User joined event:", {
        newUserId: id,
        allClients: clients,
        usernames: usernames,
        isMe: id === socketIdRef.current,
      });

      clients.forEach((socketListId) => {
        if (connections[socketListId] || socketListId === socketIdRef.current) {
          console.log(
            `⏭️ Skipping ${socketListId} (already connected or self)`,
          );
          return;
        }

        console.log(`🔗 Creating new RTCPeerConnection for ${socketListId}`);
        const peerConnection = new RTCPeerConnection(peerConfigConnections);
        connections[socketListId] = peerConnection;

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log(
              `🧊 ICE candidate for ${socketListId}:`,
              event.candidate.type,
            );
            socketRef.current.emit(
              "signal",
              socketListId,
              JSON.stringify({ ice: event.candidate }),
            );
          } else {
            console.log(`✅ All ICE candidates sent for ${socketListId}`);
          }
        };

        peerConnection.ontrack = (event) => {
          console.log(
            `🎵 Received ${event.track.kind} track from ${socketListId}`,
          );
          console.log("Stream info:", {
            streamId: event.streams[0].id,
            videoTracks: event.streams[0].getVideoTracks().length,
            audioTracks: event.streams[0].getAudioTracks().length,
          });

          const stream = event.streams[0];

          videoStreamsRef.current.set(socketListId, {
            stream: stream,
            username: usernames[socketListId] || socketListId,
          });
          console.log(
            `✅ ${videoStreamsRef.current.has(socketListId) ? "Updated" : "Added"} stream for ${socketListId}`,
          );
          updateVideosFromMap();
        };

        peerConnection.onconnectionstatechange = () => {
          console.log(
            `🔌 Connection state with ${socketListId}:`,
            peerConnection.connectionState,
          );
          if (peerConnection.connectionState === "failed") {
            console.error(`❌ Connection failed with ${socketListId}`);
          }
        };

        peerConnection.oniceconnectionstatechange = () => {
          console.log(
            `🧊 ICE state with ${socketListId}:`,
            peerConnection.iceConnectionState,
          );
          if (peerConnection.iceConnectionState === "failed") {
            console.error(`❌ ICE connection failed with ${socketListId}`);
          }
        };

        peerConnection.onsignalingstatechange = () => {
          console.log(
            `📡 Signaling state with ${socketListId}:`,
            peerConnection.signalingState,
          );
        };

        if (window.localStream) {
          console.log(`➕ Adding local stream tracks to ${socketListId}`);
          window.localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, window.localStream);
            console.log(
              `  - Added ${track.kind} track (enabled: ${track.enabled})`,
            );
          });
        } else {
          console.log(`⚠️ No local stream, using fallback for ${socketListId}`);
          const fallback = new MediaStream([black(), silence()]);
          window.localStream = fallback;
          fallback.getTracks().forEach((track) => {
            peerConnection.addTrack(track, fallback);
          });
        }
      });

      if (id === socketIdRef.current) {
        console.log("🎯 I'm the new user, creating offers...");
        for (let peerId in connections) {
          if (peerId === socketIdRef.current) continue;

          console.log(`📤 Creating offer for ${peerId}`);
          connections[peerId]
            .createOffer()
            .then((description) => {
              console.log(`✅ Offer created for ${peerId}`);
              return connections[peerId].setLocalDescription(description);
            })
            .then(() => {
              console.log(`📨 Sending offer to ${peerId}`);
              socketRef.current.emit(
                "signal",
                peerId,
                JSON.stringify({ sdp: connections[peerId].localDescription }),
              );
            })
            .catch((e) =>
              console.error(`❌ Error creating offer for ${peerId}:`, e),
            );
        }
      }
    });

    socketRef.current.on("signal", (fromId, message) => {
      console.log(`📨 Signal received from ${fromId}`);
      const signal = JSON.parse(message);
      let peer = connections[fromId];

      if (!peer) {
        console.log(`🆕 Creating new peer connection for ${fromId}`);
        peer = new RTCPeerConnection(peerConfigConnections);
        connections[fromId] = peer;

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            console.log(
              `🧊 ICE candidate for ${fromId}:`,
              event.candidate.type,
            );
            socketRef.current.emit(
              "signal",
              fromId,
              JSON.stringify({ ice: event.candidate }),
            );
          }
        };

        peer.ontrack = (event) => {
          console.log(
            `🎵 Track received from new peer ${fromId}:`,
            event.track.kind,
          );
          const stream = event.streams[0];

          videoStreamsRef.current.set(fromId, {
            stream: stream,
            username: fromId,
          });
          console.log(
            `✅ ${videoStreamsRef.current.has(fromId) ? "Updated" : "Added"} new peer stream`,
          );
          updateVideosFromMap();
        };

        peer.onconnectionstatechange = () => {
          console.log(
            `🔌 Connection state with ${fromId}:`,
            peer.connectionState,
          );
        };

        peer.oniceconnectionstatechange = () => {
          console.log(`🧊 ICE state with ${fromId}:`, peer.iceConnectionState);
        };

        if (window.localStream) {
          console.log(`➕ Adding local tracks to new peer ${fromId}`);
          window.localStream.getTracks().forEach((track) => {
            peer.addTrack(track, window.localStream);
            console.log(
              `  - Added ${track.kind} track (enabled: ${track.enabled})`,
            );
          });
        }
      }

      if (signal.sdp) {
        console.log(`📋 Processing SDP from ${fromId}:`, signal.sdp.type);
        peer
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            console.log(`✅ Remote description set for ${fromId}`);
            if (signal.sdp.type === "offer") {
              console.log(`📝 Creating answer for ${fromId}`);
              return peer.createAnswer();
            }
          })
          .then((answer) => {
            if (answer) {
              console.log(`✅ Answer created for ${fromId}`);
              return peer.setLocalDescription(answer);
            }
          })
          .then(() => {
            if (signal.sdp.type === "offer") {
              console.log(`📨 Sending answer to ${fromId}`);
              socketRef.current.emit(
                "signal",
                fromId,
                JSON.stringify({ sdp: peer.localDescription }),
              );
            }
          })
          .catch((e) =>
            console.error(`❌ Error handling SDP from ${fromId}:`, e),
          );
      }

      if (signal.ice) {
        console.log(`🧊 Adding ICE candidate from ${fromId}`);
        peer
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .then(() => console.log(`✅ ICE candidate added from ${fromId}`))
          .catch((e) =>
            console.error(`❌ Error adding ICE candidate from ${fromId}:`, e),
          );
      }
    });

    socketRef.current.on("user-left", (id) => {
      console.log(`👋 User left: ${id}`);
      if (connections[id]) {
        connections[id].close();
        delete connections[id];
      }

      if (videoStreamsRef.current.has(id)) {
        videoStreamsRef.current.delete(id);
        updateVideosFromMap();
      }
    });

    socketRef.current.on("disconnect", () => {
      console.log("🔌 Disconnected from socket server");
      for (let id in connections) {
        connections[id].close();
      }
      connections = {};
      videoStreamsRef.current.clear();
      setVideos([]);
    });
  };

  const connect = () => {
    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }
    console.log(`🚀 Starting connection as ${username}`);
    setAskForUserName(false);
    getUserMedia();
    connectToSocketServer();
  };

  const handleVideo = () => {
    console.log(`🎥 Toggling video: ${!video}`);
    setVideo(!video);
  };

  const handleAudio = () => {
    console.log(`🎤 Toggling audio: ${!audio}`);
    setAudio(!audio);
  };

  const handleScreen = () => {
    if (!screen) {
      console.log("🖥️ Starting screen share...");
      navigator.mediaDevices
        .getDisplayMedia({ video: true })
        .then((stream) => {
          try {
            if (window.localStream) {
              window.localStream.getTracks().forEach((track) => track.stop());
            }
          } catch (e) {
            console.error("Error stopping tracks:", e);
          }

          window.localStream = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          setScreen(true);
          updatePeersWithStream(stream);

          stream.getTracks().forEach((track) => {
            track.onended = () => {
              console.log("🛑 Screen share ended");
              setScreen(false);
              getUserMedia();
            };
          });
        })
        .catch((error) => {
          console.error("❌ Error accessing screen:", error);
          setScreen(false);
        });
    } else {
      console.log("🛑 Stopping screen share");
      try {
        if (window.localStream) {
          window.localStream.getTracks().forEach((track) => track.stop());
        }
      } catch (e) {
        console.error("Error stopping tracks:", e);
      }

      setScreen(false);
      getUserMedia();
    }
  };

  const sendMessage = () => {
    if (message.trim() === "" || !socketRef.current) return;

    socketRef.current.emit("chat-message", message, username);
    addMessage(message, username, socketIdRef.current);

    setMessage("");
  };

  const toggleChat = () => {
    setShowModal(!showModal);
    if (!showModal) {
      setNewMessage(0);
    }
  };

  const handleEndCall = async () => {
    console.log("Ending call...");
    console.log("=== ENDING CALL DEBUG ===");
    console.log("1. URL param:", url);
    console.log("2. Meeting code:", meetingCode);
    if (meetingCode) {
      try {
        await addToUserHistory(meetingCode);
        console.log("Meeting saved to history");
      } catch (err) {
        console.error("Error saving to history:", err);
      }
    }

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
      videoStreamsRef.current.clear();
    } catch (e) {
      console.error("Error ending call:", e);
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
            <video ref={localVideoRef} autoPlay muted></video>
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
                      <div key={idx}>
                        <p>{item.sender}</p>
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
            <IconButton onClick={handleVideo}>
              {video ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
            <IconButton onClick={handleEndCall}>
              <CallEndIcon />
            </IconButton>
            <IconButton onClick={handleAudio}>
              {audio ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
            <IconButton onClick={handleScreen}>
              {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
            </IconButton>
            <Badge badgeContent={newMessage} max={999} color="secondary">
              <IconButton onClick={toggleChat}>
                <ChatIcon />
              </IconButton>
            </Badge>
          </div>

          <div className="debugInfo">
            <strong>🔍 Debug Info:</strong> My ID: {socketIdRef.current} |
            Connected Peers: {Object.keys(connections).length} | Video Streams:{" "}
            {videos.length}
            {!videoAvailable && (
              <div>⚠️ Camera unavailable (probably in use by another tab)</div>
            )}
          </div>

          <video
            className="meetUserVideo"
            ref={localVideoRef}
            autoPlay
            muted
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
                      console.log(`🎬 Set srcObject for ${video.socketId}`, {
                        videoTracks: video.stream.getVideoTracks().length,
                        audioTracks: video.stream.getAudioTracks().length,
                      });
                    }
                  }}
                ></video>
                <div className="remoteUsername">{video.username}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
