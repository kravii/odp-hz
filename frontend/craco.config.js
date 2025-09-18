module.exports = {
  devServer: {
    allowedHosts: 'all',
    host: '0.0.0.0',
    port: 3000,
    client: {
      webSocketURL: 'ws://172.30.0.2:3000/ws',
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};