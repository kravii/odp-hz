module.exports = {
  devServer: {
    allowedHosts: ['localhost', '127.0.0.1', '0.0.0.0', 'odp01.acceldata.dvl'],
    host: '0.0.0.0',
    port: 3000,
    client: {
      webSocketURL: 'ws://odp01.acceldata.dvl:3000/ws',
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};