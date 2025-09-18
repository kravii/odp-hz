module.exports = {
  devServer: {
    allowedHosts: ['localhost', '127.0.0.1', '0.0.0.0'],
    host: '0.0.0.0',
    port: 3000,
    client: {
      webSocketURL: 'ws://localhost:3000/ws',
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};