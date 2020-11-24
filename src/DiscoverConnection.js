/**
* knx.js - a KNX protocol stack in pure Javascript
* (C) 2016-2018 Elias Karakoulakis
*/

const util = require('util');
const dgram = require('dgram');
const KnxLog = require('./KnxLog.js');
/**
  Initializes a new KNX search connection with provided values. Make
  sure the local system allows UDP messages to the multicast group.
**/
function DiscoverConnection(instance, options) {

  var log = KnxLog.get();

  instance.BindSocket = function(cb) {
    var conn = this;
    var udpSocket = dgram.createSocket({type: "udp4", reuseAddr: true});
    udpSocket.on('listening', () => {
      log.debug(util.format(
        'DiscoverConnection %s:%d, adding membership for %s',
        instance.localAddress, udpSocket.address().port, conn.remoteEndpoint.addr
      ));
      try {
        conn.socket.addMembership(conn.remoteEndpoint.addr, instance.localAddress);
      } catch (err) {
        log.warn('Discover connection: cannot add membership (%s)', err);
      }
    });
    udpSocket.bind(function() {
      cb && cb(udpSocket);
    });
    return udpSocket;
  }

  // <summary>
  ///     Start the connection
  /// </summary>
  instance.Connect = function() {
    var sm = this;
    this.localAddress = this.getLocalAddress();
    this.socket = this.BindSocket((socket) => {
      socket.on("error", (errmsg) => {
        log.debug(util.format('Socket error: %j', errmsg));
      });
      socket.on("message", (msg, rinfo, callback) => {
        log.debug('Inbound multicast message from ' + rinfo.address + ': '+ msg.toString('hex'));
        sm.onUdpSocketMessage(msg, rinfo, callback);
      });
      // start search sequence
      sm.transition('searching');
    });
    return this;
  }

  return instance;
}

module.exports = DiscoverConnection;
