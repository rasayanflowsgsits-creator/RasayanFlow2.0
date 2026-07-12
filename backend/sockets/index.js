const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const User = require("../models/User");

let ioInstance = null;

const socketHandler = (io) => {
  ioInstance = io;

  // Authenticate socket handshake using JWT
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers && socket.handshake.headers.authorization
        ? socket.handshake.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return next(new Error("Authentication error"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch (err) {
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    if (socket.userId) {
      User.findById(socket.userId).then(user => {
        if (user && user.labId) {
          socket.join(user.labId.toString());
          logger.info(`Socket ${socket.id} joined lab room: ${user.labId}`);
        }
      }).catch(err => {
        logger.error(`Error fetching user for socket lab join: ${err.message}`);
      });
    }

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};

const getIo = () => {
  if (!ioInstance) {
    throw new Error("Socket.IO not initialized");
  }
  return ioInstance;
};

module.exports = socketHandler;
module.exports.getIo = getIo;
