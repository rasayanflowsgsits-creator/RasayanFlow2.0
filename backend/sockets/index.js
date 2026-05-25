const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

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
