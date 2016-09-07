/**
* knx.js - a pure Javascript library for KNX
* (C) 2016 Elias Karakoulakis
*/

var KnxConnection = require('./KnxConnection');

var util = require('util');
var dgram = require('dgram');

/**
<summary>
  Initializes a new KNX routing connection with provided values. Make
 sure the local system allows UDP messages to the multicast group.
 </summary>
 <param name="mcastIpAddr">Multicast IP address (optional - default to 224.0.23.12)</param>
 <param name="mcastIpPort">Multicast IP port (optional - defaults to 3671)</param>
**/
function IpRoutingConnection(options) {

  if (!options) options = {};
  if (!options.ipAddr) options.ipAddr = '224.0.23.12';
  if (!options.ipPort) options.ipPort = 3671;

  var instance = new KnxConnection(options);

  instance.BindSocket = function( cb ) {
    var conn = this;
    instance.debugPrint(util.format('IpRoutingConnection.prototype.BindSocket'));
    var udpSocket = dgram.createSocket("udp4");
    udpSocket.bind(function() {
  		instance.debugPrint(util.format('adding multicast membership for %s', conn.remoteEndpoint.addr));
  		conn.control.addMembership(conn.remoteEndpoint.addr);
      cb && cb(udpSocket);
  	});
    return udpSocket;
  }

  instance.AddHPAI = function (datagram) {
    // FIXME
    console.log('ROUTING: %s %s', this.localAddresses, this.tunnel);
    // add the control udp local endpoint
    datagram.hpai = {
      protocol_type:1, // UDP
      tunnel_endpoint: this.localAddress + ":" + this.control.address().port
    };
    // add the tunneling udp local endpoint
    datagram.tunn = {
      protocol_type:1, // UDP
      tunnel_endpoint: this.localAddress + ":" + this.tunnel.address().port
    };
  }

  // <summary>
  ///     Start the connection
  /// </summary>
  instance.Connect = function (callback) {
    var sm = this;

    sm.control = sm.tunnel = sm.BindSocket( function(socket) {
      socket.on("message", function(msg, rinfo, callback)  {
        sm.debugPrint(util.format('Inbound message from multicast group %j', rinfo));
        sm.onUdpSocketMessage(msg, rinfo, callback);
      });
      // start connection sequence
      sm.transition( 'connecting');
      sm.on('connected', callback);
    });
  }
  
  return instance;
}




module.exports = IpRoutingConnection;
