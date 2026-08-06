import http from "node:http";

export function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.once("error", reject);
  });
}

export function stopServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

export function requestJson(server, { method = "GET", path = "/", body } = {}) {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const address = server.address();

  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        method,
        path,
        headers: payload
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(payload)
            }
          : undefined
      },
      (response) => {
        let text = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          text += chunk;
        });
        response.on("end", () => {
          try {
            resolve({ status: response.statusCode, body: JSON.parse(text), text });
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.once("error", reject);
    if (payload) request.write(payload);
    request.end();
  });
}
