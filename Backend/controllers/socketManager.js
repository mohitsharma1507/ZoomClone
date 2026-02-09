// const { Server } = require("socket.io");

// let connections = {};
// let messages = {};
// let timeOnline = {};

// const connectToSocket = (server) => {
//   const io = new Server(server, {
//     cors: {
//       origin: ["http://localhost:5173"],
//       methods: ["GET", "POST", "PUT", "DELETE"],
//       credentials: true,
//     },
//   });

//   io.on("connection", (socket) => {
//     console.log("A user connected:", socket.id);

//     socket.on("join-call", (path) => {
//       if (!connections[path]) {
//         connections[path] = [];
//       }
//       connections[path].push(socket.id);
//       timeOnline[socket.id] = new Date();

//       // Notify all users in the call about the new user
//       connections[path].forEach((id) => {
//         io.to(id).emit("user-joined", socket.id, connections[path]);
//       });

//       // Send chat history to the newly joined user
//       if (messages[path]) {
//         messages[path].forEach((msg) => {
//           io.to(socket.id).emit(
//             "chat-message",
//             msg.data,
//             msg.sender,
//             msg["socket-id-sender"]
//           );
//         });
//       }
//     });

//     socket.on("signal", (told, message) => {
//       io.to(told).emit("signal", socket.id, message); // Fixed incorrect variable name
//     });

//     socket.on("chat-message", (data, sender) => {
//       const [matchingRoom, found] = Object.entries(connections).reduce(
//         ([room, isFound], [roomKey, roomValue]) => {
//           if (!isFound && roomValue.includes(socket.id)) {
//             return [roomKey, true];
//           }
//           return [room, isFound];
//         },
//         ["", false]
//       );

//       if (found) {
//         if (!messages[matchingRoom]) {
//           messages[matchingRoom] = [];
//         }

//         messages[matchingRoom].push({
//           sender: sender,
//           data: data,
//           "socket-id-sender": socket.id,
//         });

//         // Broadcast the message to all users in the room
//         connections[matchingRoom].forEach((elem) => {
//           io.to(elem).emit("chat-message", data, sender, socket.id);
//         });
//       }
//     });

//     socket.on("disconnect", () => {
//       if (timeOnline[socket.id]) {
//         var diffTime = Math.abs(timeOnline[socket.id] - new Date());
//         delete timeOnline[socket.id]; // Cleanup
//       }

//       Object.entries(connections).forEach(([room, users]) => {
//         if (users.includes(socket.id)) {
//           // Notify remaining users in the room
//           users.forEach((userId) => {
//             io.to(userId).emit("user-left", socket.id);
//           });

//           // Remove user from the room
//           connections[room] = users.filter((id) => id !== socket.id);

//           // If the room is empty, delete it
//           if (connections[room].length === 0) {
//             delete connections[room];
//           }
//         }
//       });

//       console.log("A user disconnected:", socket.id);
//     }); // FIX: Added missing closing bracket
//   });

//   return io;
// };

// module.exports = connectToSocket;
const { Server } = require("socket.io");

let connections = {};
let messages = {};
let timeOnline = {};
let usernames = {}; // Add this to track usernames

const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173"],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join-call", (path, username) => {
      console.log(`${username} (${socket.id}) joining call at ${path}`);

      if (!connections[path]) {
        connections[path] = [];
      }

      // Store username
      usernames[socket.id] = username;

      connections[path].push(socket.id);
      timeOnline[socket.id] = new Date();

      // Build usernames object for this room
      const roomUsernames = {};
      connections[path].forEach((id) => {
        roomUsernames[id] = usernames[id] || id;
      });

      // Notify all users in the call about the new user
      connections[path].forEach((id) => {
        io.to(id).emit(
          "user-joined",
          socket.id,
          connections[path],
          roomUsernames,
        );
      });

      // Send chat history to the newly joined user
      if (messages[path]) {
        messages[path].forEach((msg) => {
          io.to(socket.id).emit(
            "chat-message",
            msg.data,
            msg.sender,
            msg["socket-id-sender"],
          );
        });
      }
    });

    socket.on("signal", (toId, message) => {
      console.log(`Signal from ${socket.id} to ${toId}`);
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }
          return [room, isFound];
        },
        ["", false],
      );

      if (found) {
        if (!messages[matchingRoom]) {
          messages[matchingRoom] = [];
        }

        messages[matchingRoom].push({
          sender: sender,
          data: data,
          "socket-id-sender": socket.id,
        });

        console.log(`Chat message from ${sender}: ${data}`);

        // Broadcast the message to all users in the room
        connections[matchingRoom].forEach((elem) => {
          io.to(elem).emit("chat-message", data, sender, socket.id);
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      if (timeOnline[socket.id]) {
        var diffTime = Math.abs(timeOnline[socket.id] - new Date());
        delete timeOnline[socket.id];
      }

      // Delete username
      delete usernames[socket.id];

      Object.entries(connections).forEach(([room, users]) => {
        if (users.includes(socket.id)) {
          // Notify remaining users in the room
          users.forEach((userId) => {
            io.to(userId).emit("user-left", socket.id);
          });

          // Remove user from the room
          connections[room] = users.filter((id) => id !== socket.id);

          // If the room is empty, delete it
          if (connections[room].length === 0) {
            delete connections[room];
            delete messages[room];
          }
        }
      });
    });
  });

  return io;
};

module.exports = connectToSocket;
